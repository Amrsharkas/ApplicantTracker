import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for a resume file.
  async getResumeUploadURL(userId: string): Promise<{ uploadURL: string; filePath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const fileId = randomUUID();
    const fullPath = `${privateObjectDir}/resumes/${userId}/${fileId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900, // 15 minutes
    });

    return { uploadURL, filePath: fullPath };
  }

  // Gets the resume file from the object path.
  async getResumeFile(filePath: string): Promise<File> {
    const { bucketName, objectName } = parseObjectPath(filePath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  // Get file content as buffer for processing
  async getFileContent(filePath: string): Promise<Buffer> {
    const file = await this.getResumeFile(filePath);
    const [content] = await file.download();
    return content;
  }

  // Delete a resume file from object storage
  async deleteResumeFile(filePath: string): Promise<void> {
    try {
      const { bucketName, objectName } = parseObjectPath(filePath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      
      const [exists] = await objectFile.exists();
      if (exists) {
        await objectFile.delete();
        console.log(`Deleted resume file: ${filePath}`);
      } else {
        console.log(`Resume file not found (already deleted): ${filePath}`);
      }
    } catch (error) {
      console.error(`Error deleting resume file ${filePath}:`, error);
      // Don't throw error to prevent blocking the cleanup process
    }
  }

  // Delete all resume files by user prefix
  async deleteAllResumeFiles(): Promise<void> {
    try {
      const privateObjectDir = this.getPrivateObjectDir();
      const { bucketName } = parseObjectPath(`${privateObjectDir}/resumes/`);
      const bucket = objectStorageClient.bucket(bucketName);
      
      // List all files under the resumes/ prefix
      const [files] = await bucket.getFiles({
        prefix: 'resumes/'
      });
      
      console.log(`Found ${files.length} resume files to delete`);
      
      // Delete all resume files
      for (const file of files) {
        try {
          await file.delete();
          console.log(`Deleted resume file: ${file.name}`);
        } catch (error) {
          console.error(`Error deleting resume file ${file.name}:`, error);
        }
      }
      
      console.log('All resume files deletion completed');
    } catch (error) {
      console.error('Error during bulk resume files deletion:', error);
      throw error;
    }
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}