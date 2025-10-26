import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

interface QuestionDetail {
  question_number: number;
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

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileType(file.type);
      
      // Only show preview for images, not PDFs
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post<GradingResult>(
        'http://localhost:8000/api/grade-test',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error grading test. Please try again.');
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
    setFileType('');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎓 MHE Test Grading System</h1>
        <p>Automated grading for Forklift Academy safety tests</p>
      </header>

      <div className="container">
        {!result ? (
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
                <p className="upload-hint">Scanned papers, photos, or PDF copies</p>
              </label>
            </div>

            {(selectedFile) && (
              <div className="preview-section">
                <h3>Selected File</h3>
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Test paper preview" className="preview-image" />
                ) : (
                  <div className="pdf-preview">
                    <div className="pdf-icon">📄</div>
                    <p><strong>{selectedFile.name}</strong></p>
                    <p className="file-type">PDF Document</p>
                    <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
                
                <div className="button-group">
                  <button onClick={handleUpload} disabled={loading} className="btn btn-primary">
                    {loading ? 'Processing...' : 'Grade Test Paper'}
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
        ) : (
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
                <div className="info-label">Test Type</div>
                <div className="info-value">{result.test_type}</div>
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
              <div className="info-card">
                <div className="info-label">Date</div>
                <div className="info-value">{result.date}</div>
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
              <h3>Detailed Answer Review (20 Questions - 1 Mark Each)</h3>
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
                        <span className={`answer-badge ${detail.student_answer.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}`}>
                          {detail.student_answer}
                        </span>
                      </td>
                      <td className="answer">
                        <span className={`answer-badge ${detail.correct_answer.toLowerCase()}`}>
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