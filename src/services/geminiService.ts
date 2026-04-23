/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseResume(textOrFile: string | { data: string, mimeType: string }) {
  let contents: any;
  
  if (typeof textOrFile === 'string') {
    contents = `Extract candidate information from the following resume text. 
    Normalize experience to a number (years). 
    Standardize skills and locations.
    
    Resume Text:
    ${textOrFile}`;
  } else {
    contents = [
      `Extract candidate information from the attached resume document. 
      Normalize experience to a number (years). 
      Standardize skills and locations.`,
      {
        inlineData: {
          data: textOrFile.data,
          mimeType: textOrFile.mimeType
        }
      }
    ];
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.NUMBER },
          location: { type: Type.STRING },
        },
        required: ["name", "email", "skills", "experience", "location"],
      },
    },
  });

  return JSON.parse(response.text || '{}');
}

export async function calculateMatchScore(candidate: any, job: any) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Compare the candidate profile with the job description and calculate a match score (0-100).
    Provide a brief reasoning.
    IMPORTANT COMPLIANCE INSTRUCTION: You MUST completely ignore demographic markers, unrequested data, names, age indicators, race/ethnicity, and gender. Focus EXCLUSIVELY on skills, experience, and job requirements to prevent discriminatory bias.
    
    Candidate:
    ${JSON.stringify({ skills: candidate.skills, experience: candidate.experience, parsedData: candidate.parsedData })}
    
    Job:
    ${JSON.stringify({ title: job.roleTitle, description: job.description, skills: job.skillsRequired, experience: job.experienceRequired })}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
        },
        required: ["score", "reasoning"],
      },
      temperature: 0.2
    },
  });

  return JSON.parse(response.text || '{"score": 0, "reasoning": "Error calculating score"}');
}

export async function generateJobDescription(title: string, skills: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Generate a professional, engaging job description for the role of "${title}". 
    The role requires the following skills: ${skills.join(', ')}.
    Include a brief summary, key responsibilities, and qualifications. Avoid clichés. Format as standard text or simple list (no markdown formatting code blocks).`,
    config: {
      temperature: 0.7
    }
  });

  return response.text || '';
}

export async function generateInterviewQuestions(candidate: any, job: any) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Generate 5 structured interview questions tailored specifically to test a candidate's fit for this role based on their profile.
    
    Candidate Skills: ${candidate.skills?.join(', ')}
    Candidate Experience: ${candidate.experience} years
    Job Title: ${job.roleTitle}
    Job Required Skills: ${job.skillsRequired?.join(', ')}
    
    Include a mix of technical validation and behavioral questions. Return a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      temperature: 0.7
    }
  });

  return JSON.parse(response.text || '[]');
}
