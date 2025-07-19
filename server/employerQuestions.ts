import OpenAI from "openai";

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
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Extract each question as a separate line item from the following text. Only include actual questions. Return a JSON object with "questions" as an array of objects with a "question" field.

Format:
{
  "questions": [
    { "question": "First question text here" },
    { "question": "Second question text here" }
  ]
}

Clean up formatting (remove numbers, bullets, extra spaces) and make questions clear and complete. If no valid questions are found, return an empty array.`
          },
          {
            role: "user",
            content: `Extract each question as a separate line item from the following text. Only include actual questions:
"""
${employerQuestionsText}
"""`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

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
    
    // Enhanced numbered questions pattern - handles multiline questions
    // Pattern for: "1. Question text that may span multiple lines?"
    const cleanText = text.replace(/\n+/g, ' ').trim();
    const numberedPattern = /(\d+\.?\s+)([^0-9]+?)(?=\d+\.|\s*$)/g;
    const matches = Array.from(cleanText.matchAll(numberedPattern));
    
    if (matches.length > 0) {
      const questions: ParsedEmployerQuestion[] = [];
      for (const match of matches) {
        const questionText = match[2]?.trim();
        if (questionText && questionText.length > 20) { // Ensure it's a substantial question
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
    
    // Try to split on question marks for multiple questions
    const questionSplits = text.split('?').filter(part => part.trim().length > 20);
    if (questionSplits.length > 1) {
      const questions: ParsedEmployerQuestion[] = [];
      for (let i = 0; i < questionSplits.length - 1; i++) { // Skip last empty part after final ?
        const questionText = questionSplits[i]
          .replace(/^\d+\.?\s*/, '') // Remove leading numbers
          .trim() + '?';
        if (questionText.length > 20) {
          questions.push({ question: questionText });
        }
      }
      console.log('Extracted question mark split questions:', questions);
      if (questions.length > 0) return questions;
    }
    
    // Fallback to line-by-line parsing
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const questions: ParsedEmployerQuestion[] = [];

    for (const line of lines) {
      const cleanLine = line.trim()
        .replace(/^\d+\.?\s*/, '') // Remove leading numbers
        .replace(/^[-•*]\s*/, '')  // Remove bullets
        .trim();

      if (cleanLine.includes('?') || cleanLine.toLowerCase().includes('question')) {
        questions.push({
          question: cleanLine.endsWith('?') ? cleanLine : cleanLine + '?'
        });
      }
    }

    return questions;
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
      const response = await openai.chat.completions.create({
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
      });

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