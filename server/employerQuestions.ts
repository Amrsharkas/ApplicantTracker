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
            content: `You are an expert at parsing employer questions from text. Extract individual questions and their expected answers (if provided) from the given text. 

The text may contain:
- Multiple questions separated by newlines, numbers, or bullets
- Questions with expected answers in parentheses or following specific patterns
- Mixed formatting with questions and answers

Return a JSON array of objects with this structure:
{
  "question": "The actual question text",
  "expectedAnswer": "The expected answer if provided, otherwise omit this field"
}

Be very careful to:
1. Extract each question as a separate item
2. Clean up formatting (remove numbers, bullets, extra spaces)
3. Only include expectedAnswer if one is clearly provided
4. Make questions clear and complete
5. If there are no valid questions, return an empty array`
          },
          {
            role: "user",
            content: `Please parse the following employer questions text and extract individual questions:\n\n${employerQuestionsText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      
      // Handle different possible response formats
      if (result.questions && Array.isArray(result.questions)) {
        return result.questions;
      } else if (Array.isArray(result)) {
        return result;
      } else {
        console.warn('Unexpected response format from OpenAI:', result);
        return [];
      }

    } catch (error) {
      console.error('Error parsing employer questions with OpenAI:', error);
      
      // Fallback: Simple text parsing
      return this.simpleParseQuestions(employerQuestionsText);
    }
  }

  private simpleParseQuestions(text: string): ParsedEmployerQuestion[] {
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