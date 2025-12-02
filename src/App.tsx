import React, { useState, useEffect } from 'react';
import Login from './Login';
import { 
  authAPI, 
  gradingAPI, 
  handleAPIError,
  type ExtractedData,
  type GradingResult 
} from './lib/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Manual review states
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (accessToken: string, userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
    handleReset();
  };

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

    try {
      const data = await gradingAPI.extractAnswers(selectedFile);
      setExtractedData(data);
      setEditedAnswers(data.answers);
      setShowReview(true);
    } catch (err) {
      setError(handleAPIError(err));
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
      const gradingResult = await gradingAPI.gradeWithCorrections(
        extractedData,
        editedAnswers
      );
      setResult(gradingResult);
      setShowReview(false);
    } catch (err) {
      setError(handleAPIError(err));
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
      const aNum = parseInt(a.replace(/[^0-9]/g, ''));
      const bNum = parseInt(b.replace(/[^0-9]/g, ''));
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <img src="/fai-logo.png" alt="Forklift Academy of India" className="header-logo" />
          <h1>MHE Test Grading System</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user?.full_name || user?.username}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        {!showReview && !result && (
          <div className="upload-section">
            <div className="upload-box">
              <div className="upload-icon">📄</div>
              <h2>Upload Test Paper</h2>
              <p>Supported formats: JPG, PNG, PDF</p>
              <p className="upload-hint">AI will extract answers for your review</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="btn btn-primary">
                Choose File
              </label>
              {selectedFile && (
                <p className="file-name">Selected: {selectedFile.name}</p>
              )}
            </div>

            {previewUrl && (
              <div className="preview-section">
                <h3>Preview</h3>
                {selectedFile?.type === 'application/pdf' ? (
                  <div className="pdf-preview">
                    <div className="pdf-icon">📋</div>
                    <p className="file-name">{selectedFile.name}</p>
                    <p className="file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Preview" className="preview-image" />
                )}

                <div className="button-group">
                  <button
                    onClick={handleExtractAnswers}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Extracting Answers...' : 'Extract Answers with AI'}
                  </button>
                  <button onClick={handleReset} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showReview && extractedData && (
          <div className="review-section">
            <div className="review-header">
              <h2>✏️ Review Extracted Answers</h2>
              <p className="review-subtitle">
                Please verify and correct any errors before grading
              </p>
            </div>

            <div className="info-cards">
              <div className="info-card">
                <label>Participant Name</label>
                <div className="info-value">{extractedData.participant_name}</div>
              </div>
              <div className="info-card">
                <label>Company</label>
                <div className="info-value">{extractedData.company}</div>
              </div>
              <div className="info-card">
                <label>Test Type</label>
                <div className="info-value">{extractedData.mhe_type}</div>
              </div>
              <div className="info-card">
                <label>Date</label>
                <div className="info-value">{extractedData.date}</div>
              </div>
            </div>

            <div className="review-panel">
              <h3>Extracted Answers</h3>
              <div className="answers-grid">
                {getQuestionNumbers().map(qNum => (
                  <div key={qNum} className="answer-item">
                    <label>Question {qNum}</label>
                    <select
                      value={editedAnswers[qNum]}
                      onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                      className="answer-select"
                    >
                      <option value="TRUE">TRUE</option>
                      <option value="FALSE">FALSE</option>
                      <option value="Don't Know">Don't Know</option>
                      <option value="BLANK">BLANK</option>
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
                  {loading ? 'Grading Test...' : 'Submit & Grade Test'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="result-section">
            <div className="result-header">
              <h2>✅ Grading Results</h2>
            </div>

            <div className="result-summary">
              <div className={`grade-badge grade-${result.grade.toLowerCase()}`}>
                {result.grade}
              </div>
              <div className="result-info">
                <div className="info-item">
                  <label>Participant:</label>
                  <span>{result.participant_name}</span>
                </div>
                <div className="info-item">
                  <label>Company:</label>
                  <span>{result.company}</span>
                </div>
                <div className="info-item">
                  <label>Test Type:</label>
                  <span>{result.mhe_type}</span>
                </div>
                <div className="info-item">
                  <label>Score:</label>
                  <span>{result.total_marks_obtained} / {result.total_marks}</span>
                </div>
                <div className="info-item">
                  <label>Percentage:</label>
                  <span>{result.percentage}%</span>
                </div>
              </div>
            </div>

            <div className="result-details">
              <h3>Detailed Results</h3>
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Student Answer</th>
                      <th>Correct Answer</th>
                      <th>Result</th>
                      <th>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((detail, index) => (
                      <tr key={index} className={detail.is_correct ? 'correct' : 'incorrect'}>
                        <td>{detail.question_number}</td>
                        <td>{detail.student_answer}</td>
                        <td>{detail.correct_answer}</td>
                        <td>
                          <span className={`remark ${detail.remark.toLowerCase()}`}>
                            {detail.is_correct ? '✓' : '✗'} {detail.remark}
                          </span>
                        </td>
                        <td>{detail.marks_obtained}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={4}><strong>Total</strong></td>
                      <td><strong>{result.total_marks_obtained} / {result.total_marks}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="button-group">
              <button onClick={handleReset} className="btn btn-primary">
                Grade Another Test
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;