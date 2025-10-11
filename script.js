// Combined script with all functionality
document.addEventListener('DOMContentLoaded', function() {
    // --- Semantic Similarity AI ---
    console.log("FocusGuard script loaded!");
    
    let generateEmbedding = null;
    let modelLoading = false;
    
    // UI Elements
    const slider = document.getElementById('similarity-slider');
    const thresholdValue = document.getElementById('threshold-value');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    // Initialize the model
    initializeModel();
    
    // Set up event listeners
    setupEventListeners();
    
    // Hook task buttons for similarity checking
    hookTaskButtons();
    
    // Set up mutation observer for dynamically added tasks
    setupMutationObserver();
    
    // Set up observer for injected tab list
    setupTabListObserver();
    
    async function initializeModel() {
        const loadingElement = document.getElementById('tab-similarity-loading');
        if (generateEmbedding || modelLoading) return;
        modelLoading = true;
        
        if (loadingElement) loadingElement.style.display = 'block';
        
        try {
            const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.1');
            generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log("Model loaded successfully");
        } catch (error) {
            console.error("Error loading model:", error);
            alert("Failed to load the AI model. Please check your internet connection and try again.");
        } finally {
            modelLoading = false;
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }
    
    function setupEventListeners() {
        // Update slider value display
        if (slider) {
            slider.addEventListener('input', function() {
                if (thresholdValue) {
                    thresholdValue.textContent = this.value;
                }
            });
        }
        
        // Add new task functionality
        if (addTaskBtn && taskInput && taskList) {
            addTaskBtn.addEventListener('click', addNewTask);
        }
        
        // Mode selector functionality
        if (modeButtons.length > 0) {
            modeButtons.forEach(button => {
                button.addEventListener('click', handleModeChange);
            });
        }
        
        // Set up existing task items
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            setupTaskItem(item);
        });
        setupTaskInputObserver();
    }
    
    function addNewTask() {
        const taskText = taskInput.value.trim();
        
        if (taskText === '') {
            alert('Please enter a task name');
            return;
        }
        
        // Create new task element
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        
        const taskSpan = document.createElement('span');
        taskSpan.textContent = taskText;
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'btn';
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-secondary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        
        // Add functionality to the buttons
        playBtn.addEventListener('click', function() {
            setActiveTask(taskText, this);
        });
        
        editBtn.addEventListener('click', function() {
            editTask(taskSpan, taskText);
        });
        
        // Assemble the task item
        taskActions.appendChild(playBtn);
        taskActions.appendChild(editBtn);
        taskItem.appendChild(taskSpan);
        taskItem.appendChild(taskActions);
        
        // Add to the task list
        taskList.appendChild(taskItem);
        
        // Clear the input field
        taskInput.value = '';
        
        // Set up the new task item
        setupTaskItem(taskItem);
    }
    
    function setActiveTask(taskText, buttonElement) {
        taskInput.value = taskText;
        
        // Reset all play buttons
        document.querySelectorAll('.task-item .btn').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        // Mark this one as active
        buttonElement.innerHTML = '<i class="fas fa-check"></i>';
    }
    
    function editTask(taskSpan, originalText) {
        const newTaskText = prompt('Edit your task:', taskSpan.textContent);
        if (newTaskText !== null && newTaskText.trim() !== '') {
            taskSpan.textContent = newTaskText.trim();
            
            // If this was the active task, update the input field too
            if (taskInput.value === originalText) {
                taskInput.value = newTaskText.trim();
            }
        }
    }
    
    function handleModeChange() {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        const statusDot = document.querySelector('.status-dot');
        if (this.textContent === 'Break Time') {
            statusDot.classList.add('status-off');
            document.querySelector('.status-indicator span').textContent = 'Protection Paused';
        } else {
            statusDot.classList.remove('status-off');
            document.querySelector('.status-indicator span').textContent = 'Protection Active';
        }
    }
    
    function setupTaskItem(item) {
        const playBtn = item.querySelector('.btn');
        const editBtn = item.querySelector('.btn-secondary');
        const taskSpan = item.querySelector('span');
        
        if (playBtn && !playBtn._listenerAdded) {
            playBtn.addEventListener('click', function() {
                const taskName = item.querySelector('span').textContent;
                setActiveTask(taskName, this);
            });
            playBtn._listenerAdded = true;
        }
        
        if (editBtn && !editBtn._listenerAdded) {
            editBtn.addEventListener('click', function() {
                const taskSpan = item.querySelector('span');
                editTask(taskSpan, taskSpan.textContent);
            });
            editBtn._listenerAdded = true;
        }
    }
    
    function hookTaskButtons() {
        document.querySelectorAll('.task-item .btn').forEach(btn => {
            if (!btn._similarityHooked) {
                btn._similarityHooked = true;
                btn.addEventListener('click', async function() {
                    const taskName = this.closest('.task-item').querySelector('span').textContent;
                    await compareTaskWithTabs(taskName);
                });
            }
        });
    }
    
    function setupMutationObserver() {
        if (taskList) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1 && node.classList.contains('task-item')) {
                                setupTaskItem(node);
                                hookTaskButtons();
                            }
                        });
                    }
                });
            });
            
            observer.observe(taskList, { childList: true, subtree: true });
        }
    }
    
    // Replace the entire setupTabListObserver function with this enhanced version
function setupTabListObserver() {
    const tabsContainer = document.getElementById('tabs');
    if (!tabsContainer) return;
    
    // Debounce function to prevent too many rapid comparisons
    let debounceTimer;
    function debouncedCompare() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const currentTask = taskInput.value.trim();
            if (currentTask) {
                compareTaskWithTabs(currentTask);
            }
        }, 500); // Wait 500ms after last change
    }
    
    const observer = new MutationObserver(function(mutations) {
        let shouldCompare = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length || mutation.removedNodes.length) {
                // Check if the change is related to the tab list (not just loading elements)
                const addedNodes = Array.from(mutation.addedNodes);
                const removedNodes = Array.from(mutation.removedNodes);
                
                const isTabListChange = addedNodes.some(node => 
                    node.nodeType === 1 && (node.tagName === 'UL' || node.querySelector('li'))
                ) || removedNodes.some(node => 
                    node.nodeType === 1 && (node.tagName === 'UL' || node.querySelector('li'))
                );
                
                if (isTabListChange) {
                    shouldCompare = true;
                    console.log("Tab list content updated");
                }
            }
        });
        
        if (shouldCompare) {
            debouncedCompare();
        }
    });
    
    // Observe for changes to child elements and their descendants
    observer.observe(tabsContainer, { 
        childList: true, 
        subtree: true 
    });
    
    // Also set up an interval to check for tab updates periodically
    setInterval(() => {
        const currentTask = taskInput.value.trim();
        if (currentTask) {
            compareTaskWithTabs(currentTask);
        }
    }, 1000); // Update every 30 seconds as a fallback
}

// Add this new function to handle automatic comparisons
function setupTaskInputObserver() {
    if (!taskInput) return;
    
    let lastTaskValue = '';
    let debounceTimer;
    
    taskInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const currentTask = this.value.trim();
            if (currentTask && currentTask !== lastTaskValue) {
                lastTaskValue = currentTask;
                compareTaskWithTabs(currentTask);
            }
        }, 800); // Wait 800ms after user stops typing
    });
    
    // Also compare when input loses focus
    taskInput.addEventListener('blur', function() {
        const currentTask = this.value.trim();
        if (currentTask && currentTask !== lastTaskValue) {
            lastTaskValue = currentTask;
            compareTaskWithTabs(currentTask);
        }
    });
}
    
    function cosineSimilarity(vec1, vec2) {
        let dot = 0, norm1 = 0, norm2 = 0;
        for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        return norm1 && norm2 ? dot / (norm1 * norm2) : 0;
    }
    
    // Modify the compareTaskWithTabs function to be more efficient
async function compareTaskWithTabs(currentTask) {
    const loadingElement = document.getElementById('tab-similarity-loading');
    const resultElement = document.getElementById('tab-task-similarity');
    const thresholdValue = document.getElementById('threshold-value');
    
    if (!loadingElement || !resultElement || !thresholdValue) return;
    
    // Get the threshold value from the slider display
    const threshold = parseFloat(thresholdValue.textContent);
    
    // Show loading only if it's not already showing
    if (loadingElement.style.display !== 'block') {
        loadingElement.style.display = 'block';
    }
    resultElement.style.display = 'none';
    
    await initializeModel();
    
    // Get tab titles AND URLs from the injected list
    const tabLinks = document.querySelectorAll('#tabs ul li a');
    const tabData = Array.from(tabLinks).map(link => ({
        title: link.textContent,
        url: link.href
    }));
    
    // If no tabs are available yet, show a message
    if (!currentTask || tabData.length === 0) {
        loadingElement.style.display = 'none';
        resultElement.innerHTML = '<div style="color:#666; font-style:italic;">No open tabs to compare with</div>';
        resultElement.style.display = 'block';
        return;
    }
    
    // Get embeddings
    try {
        const sentences = [currentTask, ...tabData.map(tab => tab.title)];
        const embeddings = await Promise.all(
            sentences.map(s => generateEmbedding(s, { pooling: 'mean', normalize: true }))
        );
        const taskEmbedding = embeddings[0].data;
        const results = [];
        
        for (let i = 1; i < embeddings.length; i++) {
            const sim = cosineSimilarity(taskEmbedding, embeddings[i].data);
            // Store both title and URL for each result
            results.push({ 
                title: tabData[i - 1].title, 
                url: tabData[i - 1].url,
                similarity: sim 
            });
        }
        
        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Separate results into relevant and irrelevant based on threshold
        const relevantResults = results.filter(r => r.similarity >= threshold);
        const irrelevantResults = results.filter(r => r.similarity < threshold);
        
        // Display results
        let resultHtml = `<div style="margin-bottom:15px;"><strong>Relevant Tabs (≥${(threshold * 100).toFixed(0)}% similarity):</strong></div>`;
        
        if (relevantResults.length > 0) {
            relevantResults.forEach(r => {
                const similarityPercent = (r.similarity * 100).toFixed(1);
                const color = r.similarity > 0.7 ? '#4CAF50' : (r.similarity > 0.5 ? '#FF9800' : '#F44336');
                resultHtml += `<div style="margin-bottom:4px;">
                    <a href="${r.url}" target="_blank" style="color:#007bff; text-decoration: underline; cursor: pointer;">${r.title}</a>: 
                    <b style="color:${color}">${similarityPercent}%</b>
                </div>`;
            });
        } else {
            resultHtml += `<div style="color:#666; font-style:italic; margin-bottom:15px;">
                No relevant tabs found at this threshold.
            </div>`;
        }
        
        // Show irrelevant tabs section
        resultHtml += `<div style="margin-bottom:15px; margin-top:20px; padding-top:10px; border-top:1px solid #eee;">
            <strong style="color:#999;">Irrelevant Tabs (<${(threshold * 100).toFixed(0)}% similarity):</strong>
        </div>`;

        if (irrelevantResults.length > 0) {
            // Show ALL irrelevant tabs with clickable links
            irrelevantResults.forEach(r => {
                const similarityPercent = (r.similarity * 100).toFixed(1);
                resultHtml += `<div style="margin-bottom:3px; color:#999; font-size:14px;">
                    <a href="${r.url}" target="_blank" style="color:#999; text-decoration: underline; cursor: pointer;">${r.title}</a>: 
                    <b>${similarityPercent}%</b>
                </div>`;
            });
        } else {
            resultHtml += `<div style="color:#ccc; font-style:italic;">
                All tabs are relevant at this threshold.
            </div>`;
        }

        // Show summary statistics
        resultHtml += `<div style="margin-top:15px; padding-top:10px; border-top:1px solid #eee; font-size:12px; color:#666;">
            <strong>Summary:</strong> ${relevantResults.length} relevant, ${irrelevantResults.length} irrelevant tabs
            (${((relevantResults.length / results.length) * 100).toFixed(0)}% focused)
        </div>`;
        
        resultElement.innerHTML = resultHtml;
        resultElement.style.display = 'block';
    } catch (error) {
        resultElement.innerHTML = '<div style="color:red;">Error comparing task and tabs.</div>';
        resultElement.style.display = 'block';
        console.error(error);
    } finally {
        loadingElement.style.display = 'none';
    }
}});

// Status indicator functionality
function updateStatusIndicatorFromStorage() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['protectionActive'], (result) => {
      const active = !!result.protectionActive;
      const statusDot = document.querySelector('.status-dot');
      const statusText = document.querySelector('.status-indicator span');
      if (active) {
        statusDot.classList.remove('status-off');
        statusText.textContent = 'Protection Active';
      } else {
        statusDot.classList.add('status-off');
        statusText.textContent = 'Protection Disabled';
      }
    });
  }
}

// Listen for changes to protectionActive
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.protectionActive) {
      updateStatusIndicatorFromStorage();
    }
  });
  // Initial check
  updateStatusIndicatorFromStorage();
}