

        // Chat functionality
        const chatWidget = document.getElementById('chatWidget');
        const chatContainer = document.getElementById('chatContainer');
        const chatIcon = document.getElementById('chatIcon');
        const chatInput = document.getElementById('chatInput');
        const chatMessages = document.getElementById('chatMessages');
        const sendBtn = document.getElementById('sendBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const fileUploadContainer = document.querySelector('.file-upload-container'); // MODIFICATION: Get reference

        let isOpen = false;
        let conversationContext = {
            documentType: null,
            topic: null,
            dataSource: null,
            preferences: {}
        };

        // File handling variables
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
            const supportedTypes = ['.csv', '.xlsx', '.xls', '.json'];
            
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
                    addMessage(`📎 File uploaded: <strong>${file.name}</strong> (${formatFileSize(file.size)})<br>Click "Analyze" to process this file or say "analyze ${file.name}"`, 'bot');
                } else {
                    addMessage(`❌ File type not supported: ${file.name}<br>Please upload CSV, Excel, or JSON files.`, 'bot');
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
                '.json': '📋'
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

        // Analyze file
        function analyzeFile(fileId) {
            const fileObj = uploadedFiles.find(f => f.id == fileId);
            if (!fileObj) return;
            
            // Update UI to show analysis in progress
            const fileElement = document.getElementById(`file-${fileId}`);
            fileElement.classList.add('analyzing');
            
            addMessage(`🔍 <div class="loading-spinner"></div>Analyzing <strong>${fileObj.name}</strong>...`, 'bot');
            
            // Read and analyze file
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let data;
                    if (fileObj.type === '.csv') {
                        data = parseCSV(e.target.result);
                    } else if (fileObj.type === '.json') {
                        data = JSON.parse(e.target.result);
                    } else if (fileObj.type.includes('xlsx') || fileObj.type.includes('xls')) {
                        // For demo purposes, we'll simulate Excel parsing
                        addMessage('📋 Excel file detected. For full Excel support, the backend integration is required.', 'bot');
                        fileElement.classList.remove('analyzing');
                        return;
                    }
                    
                    // Perform analysis
                    const analysis = performDataAnalysis(data, fileObj.name);
                    analysisResults[fileId] = analysis;
                    
                    // Display results
                    displayAnalysisResults(analysis, fileObj.name);
                    
                    fileElement.classList.remove('analyzing');
                    
                } catch (error) {
                    addMessage(`❌ Error analyzing ${fileObj.name}: ${error.message}`, 'bot');
                    fileElement.classList.remove('analyzing');
                }
            };
            
            reader.readAsText(fileObj.file);
        }

        // Parse CSV data
        function parseCSV(csvText) {
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length === 0) throw new Error('Empty file');
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    rows.push(row);
                }
            }
            
            return { headers, rows };
        }

        // Perform data analysis
        function performDataAnalysis(data, fileName) {
            const analysis = {
                fileName: fileName,
                summary: {
                    totalRows: data.rows.length,
                    totalColumns: data.headers.length,
                    columns: data.headers
                },
                insights: [],
                statistics: {},
                visualizations: []
            };
            
            // Basic statistics
            const numericColumns = [];
            const textColumns = [];
            
            data.headers.forEach(header => {
                const sampleValues = data.rows.slice(0, 10).map(row => row[header]);
                const isNumeric = sampleValues.every(val => !isNaN(val) && val !== '');
                
                if (isNumeric) {
                    numericColumns.push(header);
                    const values = data.rows.map(row => parseFloat(row[header])).filter(v => !isNaN(v));
                    analysis.statistics[header] = {
                        min: Math.min(...values),
                        max: Math.max(...values),
                        avg: values.reduce((a, b) => a + b, 0) / values.length,
                        count: values.length
                    };
                } else {
                    textColumns.push(header);
                    const uniqueValues = [...new Set(data.rows.map(row => row[header]))];
                    analysis.statistics[header] = {
                        uniqueCount: uniqueValues.length,
                        totalCount: data.rows.length
                    };
                }
            });
            
            // Generate insights
            analysis.insights.push(`Dataset contains ${data.rows.length} records with ${data.headers.length} columns.`);
            
            if (numericColumns.length > 0) {
                analysis.insights.push(`Found ${numericColumns.length} numeric columns: ${numericColumns.join(', ')}.`);
            }
            
            if (textColumns.length > 0) {
                analysis.insights.push(`Found ${textColumns.length} text columns: ${textColumns.join(', ')}.`);
            }
            
            // Suggest visualizations
            if (numericColumns.length >= 2) {
                analysis.visualizations.push('Correlation Analysis recommended.');
                analysis.visualizations.push('Scatter plots for numeric relationships.');
            }
            
            if (numericColumns.length >= 1) {
                analysis.visualizations.push('Distribution charts for numeric data.');
                analysis.visualizations.push('Box plots for outlier detection.');
            }
            
            return analysis;
        }

        // Display analysis results
        function displayAnalysisResults(analysis, fileName) {
            let resultHtml = `
                <div class="analysis-result">
                    <div class="analysis-header">
                        <span>📊</span>
                        <span class="analysis-title">Analysis: ${fileName}</span>
                    </div>
                    <div class="analysis-content">
                        <div class="stat-grid">
                            <div class="stat-item">
                                <div class="stat-value">${analysis.summary.totalRows}</div>
                                <div class="stat-label">Total Rows</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${analysis.summary.totalColumns}</div>
                                <div class="stat-label">Total Columns</div>
                            </div>
                        </div>
            `;
            
            // Add insights
            if (analysis.insights.length > 0) {
                resultHtml += '<strong>Key Insights:</strong><ul>';
                analysis.insights.forEach(insight => {
                    resultHtml += `<li>${insight}</li>`;
                });
                resultHtml += '</ul>';
            }
            
            // Add statistics for numeric columns
            const numericStats = Object.keys(analysis.statistics).filter(key => 
                analysis.statistics[key].hasOwnProperty('avg')
            );
            
            if (numericStats.length > 0) {
                resultHtml += '<strong>Numeric Analysis:</strong><br>';
                numericStats.forEach(col => {
                    const stats = analysis.statistics[col];
                    resultHtml += `<small><strong>${col}:</strong> Min: ${stats.min.toFixed(2)}, Max: ${stats.max.toFixed(2)}, Avg: ${stats.avg.toFixed(2)}</small><br>`;
                });
            }
            
            // Add visualizations
            if (analysis.visualizations.length > 0) {
                resultHtml += '<div class="chart-container">';
                resultHtml += '<div class="chart-placeholder">📈 Chart Generation Available<br><small>Connect to backend for live charts</small></div>';
                resultHtml += '</div>';
            }
            
            resultHtml += `
                        <br><strong>Next Steps:</strong><br>
                        <small>• Say "create report with ${fileName}" to generate a document<br>
                        • Ask "show me correlations" for relationship analysis<br>
                        • Request "generate insights" for detailed analysis</small>
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

        // Send message function
        function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;

            addMessage(message, 'user');
            chatInput.value = '';
            
            // Show typing indicator
            showTypingIndicator();
            
            // Process message
            setTimeout(() => {
                processUserMessage(message);
            }, 1000);
        }

        // Quick message function
        function sendQuickMessage(message) {
            addMessage(message, 'user');
            showTypingIndicator();
            setTimeout(() => {
                processUserMessage(message);
            }, 1000);
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

        // Process user message
        function processUserMessage(message) {
            hideTypingIndicator();
            const lowerMessage = message.toLowerCase();
            let response = '';

            // 1. Handle explicit file analysis commands first
            if (lowerMessage.includes('analyze') && uploadedFiles.length > 0) {
                let targetFile = null;
                for (let file of uploadedFiles) {
                    if (lowerMessage.includes(file.name.toLowerCase())) {
                        targetFile = file;
                        break;
                    }
                }
                if (!targetFile) {
                    // If no specific file is named, analyze the most recent one
                    targetFile = uploadedFiles[uploadedFiles.length - 1];
                }
                if (targetFile) {
                    analyzeFile(targetFile.id);
                    return; // Exit, as analyzeFile will post its own messages
                }
            }
            
            // 2. Handle contextual commands based on analyzed data
            if ((lowerMessage.includes('create') || lowerMessage.includes('generate')) && 
                (lowerMessage.includes('report') || lowerMessage.includes('document')) && 
                Object.keys(analysisResults).length > 0) {
                response = handleCreateReportWithData();
            }
            else if (lowerMessage.includes('correlation') || lowerMessage.includes('relationship')) {
                response = handleCorrelationRequest();
            }
            else if (lowerMessage.includes('insight') || lowerMessage.includes('trend')) {
                response = handleInsightsRequest();
            }

            // 3. Handle general intents if no specific contextual command was matched
            else if (lowerMessage.includes('sales report') || lowerMessage.includes('sales analysis')) {
                response = handleSalesReportRequest();
                conversationContext.documentType = 'report';
                conversationContext.topic = 'sales';
            }
            else if (lowerMessage.includes('article') || lowerMessage.includes('blog')) {
                response = handleArticleRequest();
                conversationContext.documentType = 'article';
            }
            else if (lowerMessage.includes('memo') || lowerMessage.includes('memorandum')) {
                response = handleMemoRequest();
                conversationContext.documentType = 'memo';
            }
            else if (lowerMessage.includes('analyze') && (lowerMessage.includes('data') || lowerMessage.includes('csv'))) {
                response = handleDataAnalysisRequest();
                conversationContext.documentType = 'analysis';
            }
            else if (lowerMessage.includes('upload') || lowerMessage.includes('file')) {
                response = handleFileUploadRequest();
            }
            else if (lowerMessage.includes('help') || lowerMessage.includes('started')) {
                response = handleHelpRequest();
            }
            else if (lowerMessage.includes('create') || lowerMessage.includes('generate')) {
                response = handleGenericCreateRequest(message);
            }
            else {
                response = handleGeneralQuery(message);
            }

            addMessage(response, 'bot');
        }

        // New intent handlers for file functionality
        function handleCreateReportWithData() {
            const fileCount = Object.keys(analysisResults).length;
            const fileNames = uploadedFiles.map(f => f.name).join(', ');
            
            simulateDocumentGeneration('data report');
            
            return `📊 <strong>Creating Data Report</strong><br><br>
                    Excellent! I'll create a comprehensive report using your uploaded data:<br><br>
                    📁 <strong>Files:</strong> ${fileNames}<br>
                    📈 <strong>Analysis:</strong> Statistical insights & visualizations<br>
                    📋 <strong>Format:</strong> Professional Word document<br><br>
                    <em>Processing your data and generating report...</em>`;
        }

        function handleFileUploadRequest() {
            fileUploadContainer.style.display = 'block'; // MODIFICATION: Show uploader
            return `📁 <strong>File Upload Guide</strong><br><br>
                    You can upload data files in several ways:<br><br>
                    🔹 <strong>Drag & Drop:</strong> Drag files directly into the upload area<br>
                    🔹 <strong>Click to Browse:</strong> Click the upload area to select files<br>
                    🔹 <strong>Supported Formats:</strong> CSV, Excel (.xlsx, .xls), JSON<br><br>
                    Once uploaded, I can:<br>
                    • Analyze data structure and quality<br>
                    • Generate statistical insights<br>
                    • Create visualizations<br>
                    • Build comprehensive reports<br><br>
                    Try uploading a file now!`;
        }

        function handleCorrelationRequest() {
            fileUploadContainer.style.display = 'block'; // MODIFICATION: Show uploader
            if (Object.keys(analysisResults).length === 0) {
                return `📈 <strong>Correlation Analysis</strong><br><br>
                        I'd love to show you correlations in your data! First, please upload a data file (CSV or Excel) so I can analyze the relationships between variables.<br><br>
                        Correlation analysis helps identify:<br>
                        • Which variables move together<br>
                        • Strength of relationships<br>
                        • Potential predictive factors`;
            } else {
                return `📈 <strong>Correlation Analysis</strong><br><br>
                        Analyzing correlations in your uploaded data...<br><br>
                        I'll examine relationships between numeric variables and highlight:
                        <br>• Strong positive correlations (>0.7)
                        <br>• Strong negative correlations (<-0.7)
                        <br>• Potential causal relationships
                        <br>• Business implications<br><br>
                        <em>This analysis will be included in your next report.</em>`;
            }
        }

        function handleInsightsRequest() {
            fileUploadContainer.style.display = 'block'; // MODIFICATION: Show uploader
            if (Object.keys(analysisResults).length === 0) {
                return `💡 <strong>Data Insights</strong><br><br>
                        To generate meaningful insights, I need some data to work with! Please upload:<br><br>
                        📊 CSV files with your business data<br>
                        📈 Excel spreadsheets<br>
                        📋 JSON data files<br><br>
                        I'll then provide:<br>
                        • Key trends and patterns<br>
                        • Anomalies and outliers<br>
                        • Business recommendations<br>
                        • Actionable next steps`;
            } else {
                const latestAnalysis = Object.values(analysisResults)[Object.keys(analysisResults).length - 1];
                return `💡 <strong>Advanced Insights</strong><br><br>
                        Based on your data analysis of <strong>${latestAnalysis.fileName}</strong>, here are key insights:<br><br>
                        ${latestAnalysis.insights.map(insight => `• ${insight}`).join('<br>')}
                        <br><br><strong>Recommendations:</strong><br>
                        • Consider deeper analysis of numeric relationships<br>
                        • Look for seasonal patterns if time data is available<br>
                        • Identify top performers and outliers<br><br>
                        Would you like me to create a detailed insights report?`;
            }
        }

        // Intent handlers
        function handleSalesReportRequest() {
            fileUploadContainer.style.display = 'block'; // MODIFICATION: Show uploader
            return `📊 <strong>Sales Report Generation</strong><br><br>
                    I'll help you create a comprehensive sales report! To get started, I need some information:<br><br>
                    • What time period? (Q4 2024, last month, etc.)<br>
                    • Do you have sales data files to analyze?<br>
                    • Who is the target audience?<br>
                    • Should I include charts and visualizations?<br><br>
                    You can upload CSV or Excel files, or I can create a template report for you.`;
        }

        function handleArticleRequest() {
            // Does not require file upload, so we don't show it.
            return `📝 <strong>Article Creation</strong><br><br>
                    Perfect! I can write various types of articles for you:<br><br>
                    • <strong>Topic:</strong> What subject should I cover?<br>
                    • <strong>Length:</strong> Short (500 words), Medium (1000), Long (2000+)?<br>
                    • <strong>Tone:</strong> Professional, casual, technical?<br>
                    • <strong>Audience:</strong> Who will read this?<br><br>
                    Just tell me more about what you have in mind!`;
        }

        function handleMemoRequest() {
             // Does not require file upload, so we don't show it.
            return `📋 <strong>Memo Generation</strong><br><br>
                    I'll create a professional memo for you! Please provide:<br><br>
                    • <strong>Subject:</strong> What's the memo about?<br>
                    • <strong>Recipients:</strong> Who should receive it?<br>
                    • <strong>Purpose:</strong> Announcement, request, update?<br>
                    • <strong>Key points:</strong> Main information to include<br><br>
                    I'll format it properly with all the standard memo elements.`;
        }

        function handleDataAnalysisRequest() {
            fileUploadContainer.style.display = 'block'; // MODIFICATION: Show uploader
            if (uploadedFiles.length > 0) {
                return `📈 <strong>Data Analysis</strong><br><br>
                        I see you have ${uploadedFiles.length} file(s) uploaded! I can analyze:<br><br>
                        ${uploadedFiles.map(f => `📁 ${f.name} (${f.size})`).join('<br>')}
                        <br><br>Available analyses:<br>
                        • Statistical summaries and distributions<br>
                        • Correlation analysis<br>
                        • Trend identification<br>
                        • Outlier detection<br>
                        • Custom visualizations<br><br>
                        Say "analyze [filename]" or click the analyze button next to any file!`;
            } else {
                return `📈 <strong>Data Analysis</strong><br><br>
                        Excellent! I can analyze your data and create insights. Here's what I can do:<br><br>
                        • Load CSV, Excel, or JSON files<br>
                        • Generate statistical summaries<br>
                        • Create visualizations and charts<br>
                        • Provide actionable insights<br>
                        • Export everything to Word<br><br>
                        Please upload your data files using the upload area above, then I'll analyze them for you!`;
            }
        }

        function handleHelpRequest() {
            const fileStatus = uploadedFiles.length > 0 ? 
                `<br><br>📁 <strong>Your Files:</strong> ${uploadedFiles.length} file(s) uploaded and ready for analysis!` : 
                `<br><br>💡 <strong>Tip:</strong> Upload data files to unlock advanced analytics!`;
                
            return `❓ <strong>How I Can Help</strong><br><br>
                    I'm your AI Word Automation Assistant! Here's what I can do:<br><br>
                    🔹 <strong>Create Documents:</strong> Reports, articles, memos, presentations<br>
                    🔹 <strong>Analyze Data:</strong> CSV/Excel files with charts and insights<br>
                    🔹 <strong>Professional Formatting:</strong> Styled, ready-to-use documents<br>
                    🔹 <strong>File Upload:</strong> Drag & drop data for instant analysis${fileStatus}<br><br>
                    <strong>Try saying:</strong><br>
                    • "Create a sales report with my data"<br>
                    • "Analyze the uploaded file"<br>
                    • "Show me correlations in the data"<br>
                    • "Generate insights from my CSV"<br>
                    • "Create a presentation about trends"`;
        }

        function handleGenericCreateRequest(message) {
            fileUploadContainer.style.display = 'block'; // MODIFICATION: Show uploader
            return `✨ <strong>Document Creation</strong><br><br>
                    I'd love to help you create that! To give you the best result, could you tell me:<br><br>
                    • <strong>Document type:</strong> Report, article, memo, presentation?<br>
                    • <strong>Topic/subject:</strong> What should it be about?<br>
                    • <strong>Data:</strong> Do you have files you'd like to include?<br>
                    • <strong>Purpose:</strong> Internal use, client presentation, etc.?<br><br>
                    The more details you provide, the better I can tailor the document to your needs!`;
        }

        function handleGeneralQuery(message) {
            const responses = [
                `I understand you're looking for help with "${message}". Let me clarify - are you wanting to create a document, analyze data, or need assistance with something else?`,
                `Thanks for that information! To better assist you, could you specify what type of document or analysis you need?`,
                `I'm here to help with document automation! Could you tell me more about what you'd like to create or analyze?`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
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
                        document.querySelector('.progress-title').textContent = 'Generating Document...'; // Reset title
                        addMessage(`✅ <strong>Document Complete!</strong><br><br>Your ${docType} has been generated successfully and saved to your documents folder. The file includes:<br><br>• Professional formatting<br>• Data analysis (if applicable)<br>• Charts and visualizations<br>• Executive summary<br><br>Would you like to create another document?`, 'bot');
                    }, 500);
                }
            }, 300);
        }

        // Initialize chat
        document.addEventListener('DOMContentLoaded', () => {
            // Welcome message does not show the uploader initially.
        });

        // Enhanced file upload handling with paste support
        chatInput.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            let hasFiles = false;
            
            for (let item of items) {
                if (item.kind === 'file') {
                    hasFiles = true;
                    // MODIFICATION: Show uploader when a file is pasted
                    fileUploadContainer.style.display = 'block';
                    const file = item.getAsFile();
                    if (file) {
                        handleFileUpload([file]);
                    }
                }
            }
            
            if (hasFiles) {
                // Prevent the file path from being pasted into the input
                e.preventDefault();
            }
        });

        // Auto-suggest file upload when user mentions data
        const originalAddMessage = addMessage;
        addMessage = function(content, sender) {
            originalAddMessage(content, sender);
            
            // If user mentions data but hasn't uploaded files, suggest upload
            if (sender === 'user' && uploadedFiles.length === 0) {
                const lowerContent = content.toLowerCase();
                if ((lowerContent.includes('data') || lowerContent.includes('analyze') || lowerContent.includes('csv') || lowerContent.includes('excel')) && 
                    !lowerContent.includes('help')) {
                    setTimeout(() => {
                        // Check again in case another message was sent quickly
                        if (document.getElementById('typingIndicator')) {
                           // MODIFICATION: Show uploader along with the tip
                           fileUploadContainer.style.display = 'block';
                           originalAddMessage('💡 <strong>Quick Tip:</strong> I can provide better analysis if you upload your data files! Use the upload area above to drag & drop your CSV or Excel files.', 'bot');
                        }
                    }, 1200);
                }
            }
        };
