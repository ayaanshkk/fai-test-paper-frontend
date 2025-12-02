/**
 * API Layer - Centralized API configuration and calls
 * This is the data access layer of the 3-tier architecture
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = (import.meta.env as any)?.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Type Definitions
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ExtractedData {
  mhe_type: string;
  participant_name: string;
  company: string;
  date: string;
  place: string;
  test_type: string;
  total_questions: number;
  answers: Record<string, string>;
  image_base64: string;
}

export interface QuestionDetail {
  question_number: string | number;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  remark: string;
  marks_obtained: number;
}

export interface GradingResult {
  id?: number;
  participant_name: string;
  company: string;
  date: string;
  place: string;
  test_type: string;
  mhe_type: string;
  answers: Record<string, string>;
  total_marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  details: QuestionDetail[];
  created_at?: string;
}

// API Methods

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Login user
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Get current user info
   */
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
  },

  /**
   * Logout (client-side)
   */
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};

/**
 * Test Grading API
 */
export const gradingAPI = {
  /**
   * Step 1: Extract answers from uploaded test paper
   */
  extractAnswers: async (file: File): Promise<ExtractedData> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ExtractedData>(
      '/api/extract-answers',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Step 2: Grade test with corrected answers
   */
  gradeWithCorrections: async (
    extractedData: ExtractedData,
    correctedAnswers: Record<string, string>
  ): Promise<GradingResult> => {
    const response = await apiClient.post<GradingResult>(
      '/api/grade-with-corrections',
      {
        extracted_data: extractedData,
        corrected_answers: correctedAnswers,
      }
    );
    return response.data;
  },

  /**
   * Get all test results (history)
   */
  getTestResults: async (skip = 0, limit = 50): Promise<GradingResult[]> => {
    const response = await apiClient.get<GradingResult[]>('/api/test-results', {
      params: { skip, limit },
    });
    return response.data;
  },
};

/**
 * Health Check API
 */
export const healthAPI = {
  check: async (): Promise<{ status: string }> => {
    const response = await apiClient.get<{ status: string }>('/health');
    return response.data;
  },
};

// Helper function to handle API errors
export const handleAPIError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail: string }>;
    
    // Server responded with error
    if (axiosError.response) {
      return axiosError.response.data?.detail || 'An error occurred';
    }
    
    // Request was made but no response
    if (axiosError.request) {
      return 'Network error. Please check your connection.';
    }
  }
  
  // Something else happened
  return 'An unexpected error occurred';
};

// Export the configured axios instance for advanced usage
export { apiClient };