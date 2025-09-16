import OpenAI from "openai";
import { wrapOpenAIRequest } from "./openaiTracker.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ParsedEmployerQuestion {
  question: string;
  expectedAnswer?: string;
}

export class EmployerQuestionService {
  async parseEmployerQuestions(employerQuestionsText: string): Promise<ParsedEmployerQuestion[]> {
    if (!employerQuestionsText || employerQuestionsText.trim() === '') {
      return [];
    }

    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Analyze the text and determine if it contains multiple numbered questions or is one single question.

RULES:
- If the text contains explicit numbering (1., 2., 3., etc. or 1), 2), 3), etc.), split into separate questions
- If there are NO numbers before questions, treat the entire text as ONE single question
- Clean up formatting (remove extra spaces, line breaks) but preserve the question content
- Return a JSON object with "questions" as an array of objects with a "question" field

Format:
{
  "questions": [
    { "question": "Question text here" }
  ]
}

If no valid questions are found, return an empty array.`
            },
            {
              role: "user",
              content: `Analyze this text and determine if it's one question or multiple numbered questions:
"""
${employerQuestionsText}
"""`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        }),
        {
          requestType: "parseEmployerQuestions",
          model: "gpt-4o",
        }
      );

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      console.log('OpenAI response for employer questions:', result);
      
      // Handle different possible response formats
      if (result.questions && Array.isArray(result.questions)) {
        return result.questions;
      } else if (Array.isArray(result)) {
        return result;
      } else if (result.question) {
        // Single question format - convert to array
        return [{ question: result.question, expectedAnswer: result.expectedAnswer }];
      } else {
        console.warn('Unexpected response format from OpenAI:', result);
        // Try fallback parsing
        return this.simpleParseQuestions(employerQuestionsText);
      }

    } catch (error) {
      console.error('Error parsing employer questions with OpenAI:', error);
      
      // Fallback: Simple text parsing
      return this.simpleParseQuestions(employerQuestionsText);
    }
  }

  private simpleParseQuestions(text: string): ParsedEmployerQuestion[] {
    console.log('Using fallback simple parsing for:', text);
    
    // Check if text contains explicit numbering (1., 2., 3., etc. or 1), 2), 3), etc.)
    const cleanText = text.replace(/\n+/g, ' ').trim();
    const hasNumbering = /\d+[\.)]\s+/.test(cleanText);
    
    if (hasNumbering) {
      // Multiple numbered questions - parse them separately
      const numberedPattern = /(\d+[\.)]\s+)([^0-9]+?)(?=\d+[\.)]|\s*$)/g;
      const matches = Array.from(cleanText.matchAll(numberedPattern));
      
      if (matches.length > 0) {
        const questions: ParsedEmployerQuestion[] = [];
        for (const match of matches) {
          const questionText = match[2]?.trim();
          if (questionText && questionText.length > 10) {
            // Clean up the question text
            const cleanQuestion = questionText
              .replace(/\s+/g, ' ')
              .trim();
            questions.push({ question: cleanQuestion });
          }
        }
        console.log('Extracted numbered questions:', questions);
        if (questions.length > 0) return questions;
      }
    }
    
    // No explicit numbering - treat entire text as one question
    const singleQuestion = cleanText
      .replace(/\s+/g, ' ')
      .trim();
    
    if (singleQuestion.length > 10) {
      console.log('Treating as single question:', singleQuestion);
      return [{ question: singleQuestion }];
    }
    
    return [];
  }

  async evaluateUserAnswers(questions: ParsedEmployerQuestion[], userAnswers: string[]): Promise<{
    score: number;
    feedback: string[];
    overallAssessment: string;
  }> {
    if (questions.length === 0 || userAnswers.length === 0) {
      return {
        score: 0,
        feedback: [],
        overallAssessment: "No questions or answers to evaluate."
      };
    }

    try {
      const evaluationData = questions.map((q, index) => ({
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        userAnswer: userAnswers[index] || ""
      }));

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert HR evaluator. Analyze user answers to employer questions and provide constructive feedback.

For each question-answer pair, consider:
1. Relevance to the question
2. Completeness of the answer
3. Professionalism and clarity
4. Alignment with expected answers (if provided)

Provide:
- A score from 0-100 (overall assessment)
- Individual feedback for each answer (constructive and helpful)
- An overall assessment summary

Respond with JSON in this format:
{
  "score": 85,
  "feedback": [
    "Good answer that shows relevant experience...",
    "Could be more specific about...",
    "Excellent response that demonstrates..."
  ],
  "overallAssessment": "Strong candidate responses with clear communication..."
}`
            },
            {
              role: "user",
              content: `Please evaluate these question-answer pairs:\n\n${JSON.stringify(evaluationData, null, 2)}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        }),
        {
          requestType: "evaluateUserAnswers",
          model: "gpt-4o",
        }
      );

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        score: result.score || 0,
        feedback: result.feedback || [],
        overallAssessment: result.overallAssessment || "Unable to evaluate responses."
      };

    } catch (error) {
      console.error('Error evaluating user answers with OpenAI:', error);
      
      return {
        score: 75, // Default neutral score
        feedback: userAnswers.map(() => "Your answer has been recorded for employer review."),
        overallAssessment: "Your responses have been submitted to the employer for review."
      };
    }
  }
}

export const employerQuestionService = new EmployerQuestionService();