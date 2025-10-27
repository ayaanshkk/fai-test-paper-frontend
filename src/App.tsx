import React, { useState } from 'react';
import axios from 'axios';

interface QuestionDetail {
  question_number: string | number;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  remark: string;
  marks_obtained: number;
}

interface GradingResult {
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
}

interface ExtractedData {
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

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Manual review states
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setShowReview(false);
      setExtractedData(null);
    }
  };

  const handleExtractAnswers = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post<ExtractedData>(
        'http://localhost:8000/api/extract-answers',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setExtractedData(response.data);
      setEditedAnswers(response.data.answers);
      setShowReview(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error extracting answers');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionKey: string, value: string) => {
    setEditedAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const handleSubmitWithCorrections = async () => {
    if (!extractedData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<GradingResult>(
        'http://localhost:8000/api/grade-with-corrections',
        {
          extracted_data: extractedData,
          corrected_answers: editedAnswers
        }
      );

      setResult(response.data);
      setShowReview(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error grading test');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setShowReview(false);
    setExtractedData(null);
  };

  const getQuestionNumbers = () => {
    if (!extractedData) return [];
    return Object.keys(extractedData.answers).sort((a, b) => {
      // Sort properly: 1a, 1b, 1c, 1d, 1e, 2, 3...
      const aNum = parseInt(a.replace(/[^0-9]/g, ''));
      const bNum = parseInt(b.replace(/[^0-9]/g, ''));
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎓 MHE Test Grading System</h1>
        <p>Automated grading with manual review for Forklift Academy tests</p>
      </header>

      <div className="container">
        {!showReview && !result && (
          <div className="upload-section">
            <div className="upload-box">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                id="file-input"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="upload-label">
                <div className="upload-icon">📄</div>
                <p>Click to upload or drag and drop</p>
                <p className="upload-hint">Supported: JPG, PNG, PDF</p>
              </label>
            </div>

            {previewUrl && (
              <div className="preview-section">
                <h3>Preview</h3>
                {selectedFile?.type === 'application/pdf' ? (
                  <div className="pdf-preview">
                    <div className="pdf-icon">📄</div>
                    <p className="file-type">PDF Document</p>
                    <p className="file-size">{selectedFile.name}</p>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Test paper preview" className="preview-image" />
                )}
                <div className="button-group">
                  <button onClick={handleExtractAnswers} disabled={loading} className="btn btn-primary">
                    {loading ? 'Extracting...' : 'Extract & Review Answers'}
                  </button>
                  <button onClick={handleReset} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        )}

        {showReview && extractedData && (
          <div className="review-section">
            <div className="review-header">
              <h2>📝 Review & Correct AI Extraction</h2>
              <p>Check the extracted answers and correct any mistakes before grading</p>
            </div>

            <div className="review-container">
              <div className="image-panel">
                <h3>Original Test Paper</h3>
                <img 
                  src={`data:image/jpeg;base64,${extractedData.image_base64}`} 
                  alt="Test paper" 
                  className="review-image"
                />
              </div>

              <div className="answers-panel">
                <div className="info-section">
                  <h3>Student Information</h3>
                  <div className="info-grid">
                    <div><strong>Name:</strong> {extractedData.participant_name || 'N/A'}</div>
                    <div><strong>Company:</strong> {extractedData.company || 'N/A'}</div>
                    <div><strong>MHE Type:</strong> {extractedData.mhe_type}</div>
                    <div><strong>Test Type:</strong> {extractedData.test_type}</div>
                  </div>
                </div>

                <h3>Extracted Answers - Click to Edit</h3>
                <div className="answers-grid">
                  {getQuestionNumbers().map((questionKey) => (
                    <div key={questionKey} className="answer-item">
                      <label>Q{questionKey}:</label>
                      <select
                        value={editedAnswers[questionKey] || ''}
                        onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                        className="answer-select"
                      >
                        <option value="TRUE">TRUE</option>
                        <option value="FALSE">FALSE</option>
                        <option value="Don't Know">Don't Know</option>
                        <option value="BLANK">BLANK</option>
                        {questionKey === '20' && extractedData.mhe_type === 'FORKLIFT' && (
                          <option value="BALANCE">BALANCE</option>
                        )}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="button-group">
                  <button 
                    onClick={handleSubmitWithCorrections} 
                    disabled={loading} 
                    className="btn btn-primary"
                  >
                    {loading ? 'Grading...' : 'Submit & Grade Test'}
                  </button>
                  <button onClick={handleReset} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h2>📊 Grading Results - {result.mhe_type}</h2>
              <button onClick={handleReset} className="btn btn-secondary">
                Grade Another Test
              </button>
            </div>

            <div className="info-cards">
              <div className="info-card">
                <div className="info-label">Participant</div>
                <div className="info-value">{result.participant_name}</div>
              </div>
              <div className="info-card">
                <div className="info-label">Company</div>
                <div className="info-value">{result.company}</div>
              </div>
              <div className="info-card">
                <div className="info-label">MHE Type</div>
                <div className="info-value">{result.mhe_type}</div>
              </div>
              <div className="info-card">
                <div className="info-label">Marks</div>
                <div className="info-value score">{result.total_marks_obtained} / {result.total_marks}</div>
              </div>
              <div className="info-card">
                <div className="info-label">Percentage</div>
                <div className="info-value score">{result.percentage}%</div>
              </div>
              <div className="info-card">
                <div className="info-label">Grade</div>
                <div className={`info-value ${result.grade === 'Pass' ? 'grade-pass' : 'grade-fail'}`}>
                  {result.grade}
                </div>
              </div>
            </div>

            <div className="score-bar">
              <div
                className="score-fill"
                style={{
                  width: `${result.percentage}%`,
                  backgroundColor:
                    result.percentage >= 70 ? '#10b981' : result.percentage >= 50 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>

            <div className="answers-section">
              <h3>Detailed Answer Review ({result.total_marks} Questions - 1 Mark Each)</h3>
              <table className="answers-table">
                <thead>
                  <tr>
                    <th>Q#</th>
                    <th>Student Answer</th>
                    <th>Correct Answer</th>
                    <th>Remark</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((detail) => (
                    <tr key={detail.question_number} className={detail.is_correct ? 'correct' : 'incorrect'}>
                      <td>{detail.question_number}</td>
                      <td className="answer">
                        <span className={`answer-badge ${String(detail.student_answer).toLowerCase().replace(/'/g, '').replace(/ /g, '-')}`}>
                          {detail.student_answer}
                        </span>
                      </td>
                      <td className="answer">
                        <span className={`answer-badge ${String(detail.correct_answer).toLowerCase()}`}>
                          {detail.correct_answer}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${detail.is_correct ? 'badge-correct' : 'badge-incorrect'}`}>
                          {detail.remark}
                        </span>
                      </td>
                      <td className="marks">{detail.marks_obtained}/1</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={4}><strong>Total</strong></td>
                    <td className="marks"><strong>{result.total_marks_obtained}/{result.total_marks}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;