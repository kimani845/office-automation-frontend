// Chat functionality
        const chatWidget = document.getElementById('chatWidget');
        const chatContainer = document.getElementById('chatContainer');
        const chatIcon = document.getElementById('chatIcon');
        const chatInput = document.getElementById('chatInput');
        const chatMessages = document.getElementById('chatMessages');
        const sendBtn = document.getElementById('sendBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const fileUploadContainer = document.querySelector('.file-upload-container');

        // Flask API Configuration
        const API_BASE_URL = 'http://localhost:5000'; 
        let isOpen = false;
        let conversationContext = {
            documentType: null,
            topic: null,
            dataSource: null,
            preferences: {}
        };

        // File handling 
        let uploadedFiles = [];
        let analysisResults = {};

        // File upload functionality
        const fileDropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('fileInput');
        const uploadedFilesContainer = document.getElementById('uploadedFiles');

        // Drag and drop handlers
        fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropZone.classList.add('drag-over');
        });

        fileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileDropZone.classList.remove('drag-over');
        });

        fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            handleFileUpload(files);
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFileUpload(files);
        });

        // Handle file upload
        function handleFileUpload(files) {
            const supportedTypes = ['.csv', '.xlsx', '.xls', '.json', '.docx'];
            
            files.forEach(file => {
                const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
                
                if (supportedTypes.includes(fileExtension)) {
                    const fileObj = {
                        id: Date.now() + Math.random(),
                        file: file,
                        name: file.name,
                        size: formatFileSize(file.size),
                        type: fileExtension,
                        uploadTime: new Date()
                    };
                    
                    uploadedFiles.push(fileObj);
                    displayUploadedFile(fileObj);
                    
                    // Notify user
                    addMessage(`File uploaded: <strong>${file.name}
                        </strong> (${formatFileSize(file.size)})
                        <br>Click "Analyze" to process this file or say "analyze ${file.name}"`, 'bot');
                } else {
                    addMessage(`File type not supported: 
                        ${file.name}<br>Please upload CSV, Excel, or JSON files.`, 'bot');
                }
            });
            
            // Clear file input
            fileInput.value = '';
        }

        // Display uploaded file
        function displayUploadedFile(fileObj) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.id = `file-${fileObj.id}`;
            
            const fileIcon = getFileIcon(fileObj.type);
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">${fileIcon}</span>
                    <div class="file-details">
                        <div class="file-name">${fileObj.name}</div>
                        <div class="file-size">${fileObj.size}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn analyze" onclick="analyzeFile('${fileObj.id}')" title="Analyze File">
                        📊
                    </button>
                    <button class="file-action-btn remove" onclick="removeFile('${fileObj.id}')" title="Remove File">
                        🗑️
                    </button>
                </div>
            `;
            
            uploadedFilesContainer.appendChild(fileItem);
        }

        // Get file icon
        function getFileIcon(fileType) {
            const icons = {
                '.csv': '📊',
                '.xlsx': '📈',
                '.xls': '📈',
                '.json': '📋',
                '.docx': '📋'
            };
            return icons[fileType] || '📄';
        }

        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        // API INTEGRATION: Analyze file using Flask API
        async function analyzeFile(fileId) {
            const fileObj = uploadedFiles.find(f => f.id == fileId);
            if (!fileObj) return;
            
            // Show analysis progress
            const fileElement = document.getElementById(`file-${fileId}`);
            fileElement.classList.add('analyzing');
            
            addMessage(`🔍 <div class="loading-spinner"></div>Analyzing <strong>${fileObj.name}</strong>...`, 'bot');
            
            try {
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('file', fileObj.file);
                formData.append('instruction', 'Perform a comprehensive analysis of this data');

                // Send to Flask API
                const response = await fetch(`${API_BASE_URL}/upload_and_analyze`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const analysisResult = await response.json();
                analysisResults[fileId] = analysisResult;
                
                // Display results from Flask API
                displayFlaskAnalysisResults(analysisResult, fileObj.name);
                
                fileElement.classList.remove('analyzing');
                
            } catch (error) {
                console.error('Analysis error:', error);
                addMessage(`❌ Error analyzing ${fileObj.name}: ${error.message}`, 'bot');
                fileElement.classList.remove('analyzing');
            }
        }

        // Display analysis results from Flask API
        function displayFlaskAnalysisResults(analysis, fileName) {
            let resultHtml = `
                <div class="analysis-result">
                    <div class="analysis-header">
                        <span>📊</span>
                        <span class="analysis-title">Analysis: ${fileName}</span>
                    </div>
                    <div class="analysis-content">
            `;

            // Display summary if available
            if (analysis.summary) {
                resultHtml += `<div class="stat-grid">`;
                if (analysis.summary.total_rows) {
                    resultHtml += `
                        <div class="stat-item">
                            <div class="stat-value">${analysis.summary.total_rows}</div>
                            <div class="stat-label">Total Rows</div>
                        </div>
                    `;
                }
                if (analysis.summary.total_columns) {
                    resultHtml += `
                        <div class="stat-item">
                            <div class="stat-value">${analysis.summary.total_columns}</div>
                            <div class="stat-label">Total Columns</div>
                        </div>
                    `;
                }
                resultHtml += `</div>`;
            }

            // Display key insights
            if (analysis.key_insights && analysis.key_insights.length > 0) {
                resultHtml += '<strong>Key Insights:</strong><ul>';
                analysis.key_insights.forEach(insight => {
                    resultHtml += `<li>${insight}</li>`;
                });
                resultHtml += '</ul>';
            }

            // Display statistical analysis
            if (analysis.statistical_analysis) {
                resultHtml += '<strong>Statistical Analysis:</strong><br>';
                if (typeof analysis.statistical_analysis === 'object') {
                    Object.keys(analysis.statistical_analysis).forEach(key => {
                        const stats = analysis.statistical_analysis[key];
                        if (typeof stats === 'object' && stats !== null) {
                            resultHtml += `<small><strong>${key}:</strong> ${JSON.stringify(stats)}</small><br>`;
                        }
                    });
                } else {
                    resultHtml += `<small>${analysis.statistical_analysis}</small><br>`;
                }
            }

            // Display recommendations
            if (analysis.recommendations && analysis.recommendations.length > 0) {
                resultHtml += '<strong>Recommendations:</strong><ul>';
                analysis.recommendations.forEach(rec => {
                    resultHtml += `<li>${rec}</li>`;
                });
                resultHtml += '</ul>';
            }

            resultHtml += `
                        <br><strong>Next Steps:</strong><br>
                        <small>• Say "create report with ${fileName}" to generate a document<br>
                        • Ask "show me more insights" for detailed analysis<br>
                        • Request "generate recommendations" for actionable items</small>
                    </div>
                </div>
            `;
            
            addMessage(resultHtml, 'bot');
            
            // Update conversation context
            conversationContext.dataSource = fileName;
            conversationContext.analysisResults = analysis;
        }

        // Remove file
        function removeFile(fileId) {
            uploadedFiles = uploadedFiles.filter(f => f.id != fileId);
            document.getElementById(`file-${fileId}`).remove();
            delete analysisResults[fileId];
            
            addMessage('🗑️ File removed from analysis queue.', 'bot');
        }

        // Toggle chat
        chatWidget.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                chatContainer.classList.add('show');
                chatWidget.classList.add('active');
                chatIcon.textContent = '✕';
                chatIcon.classList.add('close');
                chatInput.focus();
            } else {
                chatContainer.classList.remove('show');
                chatWidget.classList.remove('active');
                chatIcon.textContent = '💬';
                chatIcon.classList.remove('close');
            }
        });

        // Send message on Enter
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // API INTEGRATION: Send message function with Flask API
        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;

            addMessage(message, 'user');
            chatInput.value = '';
            
            // Show typing indicator
            showTypingIndicator();
            
            try {
                // Send message to Flask API
                const response = await fetch(`${API_BASE_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                hideTypingIndicator();
                
                // Handle different response types from Flask
                if (result.bot_message) {
                    addMessage(result.bot_message, 'bot');
                }

                // Handle specific actions returned by Flask
                if (result.action) {
                    handleFlaskAction(result.action, result.params, message);
                }

                // Handle report content
                if (result.report_content) {
                    addMessage(`📊 <strong>Report Generated:</strong><br><br>${result.report_content}`, 'bot');
                }

                // Handle letter/article content
                if (result.letter_content) {
                    addMessage(`📝 <strong>Letter/Article Generated:</strong><br><br>${result.letter_content}`, 'bot');
                }
                
            } catch (error) {
                console.error('Chat API error:', error);
                hideTypingIndicator();
                addMessage(`❌ Sorry, I encountered an error: ${error.message}. Please try again.`, 'bot');
            }
        }

        // Handle actions returned by Flask API
        function handleFlaskAction(action, params, originalMessage) {
            switch(action) {
                case 'analyze_data':
                    if (uploadedFiles.length === 0) {
                        fileUploadContainer.style.display = 'block';
                        addMessage(' I see you want to analyze data! Please upload your data file using the upload area above, and I\'ll analyze it for you.', 'bot');
                    } else {
                        addMessage('I can analyze your uploaded files. Which file would you like me to analyze, or should I analyze the most recent one?', 'bot');
                    }
                    break;
                
                case 'create_report':
                    if (Object.keys(analysisResults).length > 0) {
                        simulateDocumentGeneration('data report');
                    } else {
                        addMessage('I can create a report for you! Do you have data to include, or should I create a general report based on your requirements?', 'bot');
                    }
                    break;
                
                case 'write_letter':
                    addMessage(' I\'ll help you write a letter. What\'s the purpose and who is the recipient?', 'bot');
                    break;
                
                case 'send_email':
                    addMessage(' I can help compose an email. Please provide the subject, recipient, and main points you\'d like to include.', 'bot');
                    break;
                
                default:
                    break;
            }
        }

        // Quick message function
        function sendQuickMessage(message) {
            addMessage(message, 'user');
            showTypingIndicator();
            chatInput.value = message;
            sendMessage();
        }

        // Add message to chat
        function addMessage(content, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = content;
            
            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Show typing indicator
        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot';
            typingDiv.id = 'typingIndicator';
            
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.style.display = 'block';
            indicator.innerHTML = `
                <div class="typing-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
            
            typingDiv.appendChild(indicator);
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Hide typing indicator
        function hideTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // Process user message (legacy - now handled by Flask API)
        function processUserMessage(message) {
            // This function is now primarily handled by the Flask API
            // but kept for backward compatibility with direct analyze commands
            hideTypingIndicator();
            const lowerMessage = message.toLowerCase();

            // Handle explicit file analysis commands locally for immediate response
            if (lowerMessage.includes('analyze') && uploadedFiles.length > 0) {
                let targetFile = null;
                for (let file of uploadedFiles) {
                    if (lowerMessage.includes(file.name.toLowerCase())) {
                        targetFile = file;
                        break;
                    }
                }
                if (!targetFile) {
                    targetFile = uploadedFiles[uploadedFiles.length - 1];
                }
                if (targetFile) {
                    analyzeFile(targetFile.id);
                    return;
                }
            }

          
            addMessage('I\'m processing your request through my AI agents. Please make sure the server is running!', 'bot');
        }

        // Simulate document generation 
        function simulateDocumentGeneration(docType) {
            progressContainer.style.display = 'block';
            let progress = 0;
            
            const steps = [
                'Analyzing requirements...',
                'Generating content with AI...',
                'Processing data analysis...',
                'Creating visualizations...',
                'Formatting document...',
                'Finalizing output...'
            ];
            
            let stepIndex = 0;
            
            const interval = setInterval(() => {
                progress += Math.random() * 20 + 5;
                if (progress > 100) progress = 100;
                
                progressFill.style.width = progress + '%';
                
                if (stepIndex < steps.length) {
                    document.querySelector('.progress-title').textContent = steps[stepIndex];
                    stepIndex++;
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        progressFill.style.width = '0%';
                        document.querySelector('.progress-title').textContent = 'Generating Document...';
                        addMessage(`<strong>Document Complete!</strong><br>
                            <br>Your ${docType} has been generated successfully and is ready for use. The document includes:<br>
                            <br>• Professional formatting<br>• AI-generated content<br>• Data analysis (if applicable)<br>
                            • Executive summary<br><br>Would you like to create another document?`, 'bot');
                    }, 500);
                }
            }, 300);
        }

        // Initialize chat
        document.addEventListener('DOMContentLoaded', () => {
            // Add initial welcome message
            addMessage('<strong>Welcome!</strong> I\'m your AI Document Assistant powered by advanced language models. I can help you:<br><br>• Analyze data files (CSV, Excel, JSON)<br>• Generate reports and articles<br>• Create professional documents<br>• Process natural language requests<br><br>Try uploading a file or ask me to create something!', 'bot');
        });

        // Enhanced file upload handling with paste support
        chatInput.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            let hasFiles = false;
            
            for (let item of items) {
                if (item.kind === 'file') {
                    hasFiles = true;
                    fileUploadContainer.style.display = 'block';
                    const file = item.getAsFile();
                    if (file) {
                        handleFileUpload([file]);
                    }
                }
            }
            
            if (hasFiles) {
                e.preventDefault();
            }
        });

        // Auto-suggest file upload when user mentions data
        const originalAddMessage = addMessage;
        addMessage = function(content, sender) {
            originalAddMessage(content, sender);
            
            if (sender === 'user' && uploadedFiles.length === 0) {
                const lowerContent = content.toLowerCase();
                if ((lowerContent.includes('data') || lowerContent.includes('analyze') || lowerContent.includes('csv') || lowerContent.includes('excel')) && 
                    !lowerContent.includes('help')) {
                    setTimeout(() => {
                        if (document.getElementById('typingIndicator')) {
                           fileUploadContainer.style.display = 'block';
                           originalAddMessage('💡 <strong>Quick Tip:</strong> I can provide better analysis if you upload your data files! Use the upload area above to drag & drop your CSV or Excel files.', 'bot');
                        }
                    }, 1200);
                }
            }
        };

        // Error handling for API connectivity
        window.addEventListener('error', (e) => {
            if (e.error && e.error.message && e.error.message.includes('fetch')) {
                console.warn('API connectivity issue detected. Check if Flask server is running on', API_BASE_URL);
            }
        });

        // Add connection status indicator (optional)
        async function checkAPIConnection() {
            try {
                const response = await fetch(`${API_BASE_URL}/`, { method: 'HEAD' });
                return response.ok;
            } catch (error) {
                return false;
            }
        }

        // Check API connection on page load (optional)
        document.addEventListener('DOMContentLoaded', async () => {
            const isConnected = await checkAPIConnection();
            if (!isConnected) {
                console.warn('Warning: Cannot connect to Flask API at', API_BASE_URL);
                addMessage('⚠️ <strong>Connection Notice:</strong> Make sure your Flask server is running for full functionality. You can still upload files locally.', 'bot');
            }
        });