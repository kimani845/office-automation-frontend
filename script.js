document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendBtn = document.getElementById('sendBtn');
    const fileUploadContainer = document.querySelector('.file-upload-container');
    const fileDropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('fileInput');

    // NEW: Document Generation Modal Elements
    const docGenModal = document.getElementById('docGenModal');
    const docGenForm = document.getElementById('docGenForm');
    const docGenModalClose = document.getElementById('docGenModalClose');
    const docGenCancelBtn = document.getElementById('docGenCancel');

    // --- State and Configuration ---
    const API_BASE_URL = 'http://localhost:5000';

    // --- Event Listeners ---
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    sendBtn.addEventListener('click', sendMessage);

    fileDropZone.addEventListener('dragover', (e) => { e.preventDefault(); fileDropZone.classList.add('drag-over'); });
    fileDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); fileDropZone.classList.remove('drag-over'); });
    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('drag-over');
        handleFileUpload(Array.from(e.dataTransfer.files));
    });
    fileInput.addEventListener('change', (e) => handleFileUpload(Array.from(e.target.files)));

    // NEW: Modal Form Listeners
    docGenForm.addEventListener('submit', handleDocumentGenerationSubmit);
    docGenModalClose.addEventListener('click', () => docGenModal.style.display = 'none');
    docGenCancelBtn.addEventListener('click', () => docGenModal.style.display = 'none');


    // --- Main Functions ---

    // Send initial message to the /chat endpoint
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';
        showTypingIndicator();

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

            const result = await response.json();
            hideTypingIndicator();

            if (result.bot_message) {
                addMessage(result.bot_message, 'bot');
            }

            // Central logic to decide what to do next based on the backend's response
            if (result.action) {
                handleFlaskAction(result.action, result.params || {});
            }

        } catch (error) {
            console.error('Chat API error:', error);
            hideTypingIndicator();
            addMessage(`❌ Sorry, an error occurred: ${error.message}. Please check if the server is running.`, 'bot');
        }
    }

    // This function routes the backend's response to the correct frontend action
    function handleFlaskAction(action, params) {
        switch(action) {
            case 'create_document':
                // The backend says we need to make a document, so we show the form.
                showDocumentGenerationForm(params);
                break;
            case 'analyse_data':
                // The backend says we need to analyze data, so we show the file uploader.
                fileUploadContainer.style.display = 'block';
                addMessage('I can help with that. Please upload a data file (CSV, Excel) using the area above.', 'bot');
                break;
            default:
                // For other actions or 'unknown'
                console.log(`Action received: ${action}`, params);
                break;
        }
    }

    // Function to show the form and pre-fills it with any data from the backend
    function showDocumentGenerationForm(params) {
        docGenForm.reset(); // Clear any old data from the form

        // Use the parameters from the backend to pre-fill the form
        document.getElementById('docGenType').value = params.doc_type || 'cover_letter';
        document.getElementById('docGenTopic').value = params.topic || '';
        document.getElementById('docGenAudience').value = params.audience || '';
        document.getElementById('docGenTone').value = params.tone || 'formal';
        document.getElementById('docGenLength').value = params.length || 'medium';

        // Display the modal
        docGenModal.style.display = 'flex';
    }

    // Runs when the user submits the document details form
    async function handleDocumentGenerationSubmit(event) {
        event.preventDefault(); // Stop the page from reloading

        // Collect all data from the form into an object
        const formData = new FormData(docGenForm);
        const requestData = Object.fromEntries(formData.entries());

        docGenModal.style.display = 'none'; // Hide the form
        addMessage(`📝 Generating your '${requestData.doc_type.replace('_', ' ')}'... please wait.`, 'bot');
        showTypingIndicator();

        try {
            // Send the complete data to the /generate_document endpoint
            const response = await fetch(`${API_BASE_URL}/generate_document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.statusText}`);
            }

            const result = await response.json();
            hideTypingIndicator();

            // Display the download link from the successful response
            if (result.download_url) {
                const successMessage = `
                    <strong>Document Generated!</strong><br>
                    Click the link below to download your file.<br><br>
                    <a href="${result.download_url}" target="_blank" download class="download-link">
                        📥 Download ${result.filename}
                    </a>
                `;
                addMessage(successMessage, 'bot');
            } else {
                throw new Error("The server did not return a download link.");
            }

        } catch (error) {
            console.error('Document Generation error:', error);
            hideTypingIndicator();
            addMessage(`❌ There was a problem generating your document: ${error.message}`, 'bot');
        }
    }


    // --- File Handling & UI Helpers ---

    function handleFileUpload(files) {
        const supportedTypes = ['.csv', '.xlsx', '.xls'];
        files.forEach(file => {
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            if (supportedTypes.includes(fileExtension)) {
                analyzeFile(file); // For simplicity, analyze immediately
            } else {
                addMessage(`Unsupported file type: ${file.name}. Please use CSV or Excel.`, 'bot');
            }
        });
        fileInput.value = '';
    }

    async function analyzeFile(file) {
        addMessage(`🔍 Analyzing <strong>${file.name}</strong>...`, 'bot');
        showTypingIndicator();
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('instruction', `Analyze the data in ${file.name}`);

            const response = await fetch(`${API_BASE_URL}/upload_and_analyze`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const analysisResult = await response.json();
            hideTypingIndicator();
            const summary = analysisResult.summary || 'No summary available.';
            addMessage(`<strong>Analysis Complete for ${file.name}:</strong><br><pre>${JSON.stringify(summary, null, 2)}</pre>`, 'bot');

        } catch (error) {
            console.error('Analysis error:', error);
            hideTypingIndicator();
            addMessage(`❌ Error analyzing ${file.name}: ${error.message}`, 'bot');
        }
    }
    
    // Function for quick action buttons
    window.sendQuickMessage = function(message) {
        chatInput.value = message;
        sendMessage();
    }

    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = content;
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        if (document.getElementById('typingIndicator')) return;
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'message bot';
        typingDiv.innerHTML = `<div class="typing-indicator"><div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    // --- Initial Load ---
    addMessage('<strong>Welcome!</strong> I\'m your AI Office Assistant. How can I help you today?', 'bot');
});