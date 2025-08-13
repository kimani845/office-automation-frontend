
document.addEventListener('DOMContentLoaded', (event) => {
    // DOM Elements
    const chatWidget = document.getElementById('chatWidget');
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const fileDropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadedFilesContainer = document.getElementById('uploadedFiles');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');

    // Backend API URL (adjust if your Flask app runs on a different port/host)
    const API_BASE_URL = 'http://127.0.0.1:5000'; // Flask default is 5000

    // Toggle Chat Widget
    chatWidget.addEventListener('click', () => {
        chatContainer.classList.toggle('open');
        chatWidget.classList.toggle('open');
        if (chatContainer.classList.contains('open')) {
            chatInput.focus(); // Focus input when chat opens
        }
    });

    // Send Message on click or Enter key
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Handle Quick Actions
    window.sendQuickMessage = (message) => {
        appendMessage(message, 'user');
        sendToBackend('/chat', { message: message });
    };

    // --- File Upload Logic ---
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
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files);
    });

    function handleFiles(files) {
        uploadedFilesContainer.innerHTML = ''; // Clear previous files
        if (files.length > 0) {
            const fileName = files[0].name; // Only handle first file for simplicity
            uploadedFilesContainer.textContent = `Uploaded: ${fileName}`;
            appendMessage(`File "${fileName}" ready for analysis.`, 'user');
            // Now send the file to the backend
            uploadFileAndAnalyze(files[0]);
        }
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
    }

    function showProgress(percent) {
        progressContainer.style.display = 'block';
        progressFill.style.width = `${percent}%`;
        if (percent >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressFill.style.width = '0%';
            }, 1000); // Hide after a short delay
        }
    }

    function sendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === "") return;

        appendMessage(messageText, 'user');
        chatInput.value = '';

        // Send message to Flask backend
        sendToBackend('/chat', { message: messageText });
    }

    async function sendToBackend(endpoint, data) {
        appendMessage('Thinking...', 'bot'); // thinking indicator
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            
            // Remove thinking indicator
            const lastMessage = chatMessages.lastChild;
            if (lastMessage && lastMessage.classList.contains('bot') && lastMessage.querySelector('.message-content').textContent === 'Thinking...') {
                lastMessage.remove();
            }

            if (response.ok) {
                // If the chat endpoint sends a specific bot_message
                if (result.bot_message) {
                    appendMessage(result.bot_message, 'bot');
                } else if (result.action) {
                    // For parsed actions from chat, you might want a custom response
                    appendMessage(`I've detected the action: ${result.action}. Parameters: ${JSON.stringify(result.params)}`, 'bot');
                } else if (result.summary) { // This is likely from an analysis
                    appendMessage(`Analysis Summary: ${result.summary}`, 'bot');
                    if (result.insights && result.insights.length > 0) {
                        appendMessage('Key Insights:\n' + result.insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n'), 'bot');
                    }
                    if (result.recommended_visualizations && result.recommended_visualizations.length > 0) {
                        appendMessage('Recommended Visualizations:\n' + result.recommended_visualizations.map(v => `- ${v}`).join('\n'), 'bot');
                    }
                    if (result.pandas_code_snippet) {
                        appendMessage('Here\'s a pandas snippet:\n```python\n' + result.pandas_code_snippet + '\n```', 'bot');
                    }
                } else {
                    // Generic success
                    appendMessage("Operation successful!", 'bot');
                }
            } else {
                appendMessage(`Error: ${result.error || 'Unknown error'}`, 'bot');
            }
        } catch (error) {
            console.error('Network or API error:', error);
            // Remove thinking indicator
            const lastMessage = chatMessages.lastChild;
            if (lastMessage && lastMessage.classList.contains('bot') && lastMessage.querySelector('.message-content').textContent === 'Thinking...') {
                lastMessage.remove();
            }
            appendMessage(`Sorry, there was a problem connecting to the assistant. (${error.message})`, 'bot');
        }
    }

    async function uploadFileAndAnalyze(file) {
        appendMessage('Uploading and analyzing...', 'bot');
        showProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('instruction', chatInput.value || 'Perform a general analysis.'); // Send current chat input as instruction

        try {
            const response = await fetch(`${API_BASE_URL}/upload_and_analyze`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            showProgress(100);

            // Remove previous "Uploading and analyzing..." message
            const lastMessage = chatMessages.lastChild;
            if (lastMessage && lastMessage.classList.contains('bot') && lastMessage.querySelector('.message-content').textContent === 'Uploading and analyzing...') {
                lastMessage.remove();
            }

            if (response.ok) {
                appendMessage('Analysis complete!', 'bot');
                // Display analysis results
                if (result.summary) {
                    appendMessage(`Analysis Summary: ${result.summary}`, 'bot');
                    if (result.insights && result.insights.length > 0) {
                        appendMessage('Key Insights:\n' + result.insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n'), 'bot');
                    }
                    if (result.recommended_visualizations && result.recommended_visualizations.length > 0) {
                        appendMessage('Recommended Visualizations:\n' + result.recommended_visualizations.map(v => `- ${v}`).join('\n'), 'bot');
                    }
                    if (result.pandas_code_snippet) {
                        appendMessage('Here\'s a pandas snippet:\n```python\n' + result.pandas_code_snippet + '\n```', 'bot');
                    }
                } else {
                    appendMessage("File processed, but no specific analysis summary returned.", 'bot');
                }
            } else {
                appendMessage(`Error during file upload or analysis: ${result.error || 'Unknown error'}`, 'bot');
            }
        } catch (error) {
            console.error('File upload/analysis network error:', error);
            showProgress(0); // Reset progress on error
            // Remove previous message
            const lastMessage = chatMessages.lastChild;
            if (lastMessage && lastMessage.classList.contains('bot') && lastMessage.querySelector('.message-content').textContent === 'Uploading and analyzing...') {
                lastMessage.remove();
            }
            appendMessage(`Sorry, there was a problem uploading or analyzing the file. (${error.message})`, 'bot');
        }
    }
});

