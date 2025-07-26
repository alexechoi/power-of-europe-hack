// Google Search Enhancer Content Script
(function() {
    'use strict';

    // Configuration
    const BACKEND_URL = 'https://elegant-gussie-power-of-europe-fa86a983.koyeb.app';
    const LOADING_DURATION = 7000; // 7 seconds

    // Extract search query from URL
    function getSearchQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('q') || '';
    }

    // Parse JSON from response that may contain ```json code blocks
    function parseJSONFromResponse(response) {
        try {
            // First try to parse the entire response as JSON
            return JSON.parse(response);
        } catch (e) {
            // If that fails, look for ```json code blocks
            const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
            const match = response.match(jsonBlockRegex);
            
            if (match && match[1]) {
                try {
                    // Remove all text after the closing bracket "]"
                    let jsonText = match[1].trim();
                    const closingBracketIndex = jsonText.lastIndexOf(']');
                    if (closingBracketIndex !== -1) {
                        jsonText = jsonText.substring(0, closingBracketIndex + 1);
                    }
                    
                    return JSON.parse(jsonText);
                } catch (parseError) {
                    console.error('Error parsing JSON from code block:', parseError);
                    return null;
                }
            }

            else {
                try {
                    // Look for JSON array in the response text
                    const openingBracketIndex = response.indexOf('[');
                    const closingBracketIndex = response.lastIndexOf(']');
                    
                    if (openingBracketIndex !== -1 && closingBracketIndex !== -1 && closingBracketIndex > openingBracketIndex) {
                        const jsonText = response.substring(openingBracketIndex, closingBracketIndex + 1);
                        return JSON.parse(jsonText);
                    }
                    
                    console.error('No valid JSON array found in response');
                    return null;
                } catch (parseError) {
                    console.error('Error parsing JSON from response text:', parseError);
                    return null;
                }
            }
        }
    }

    // Create HTML for alternative cards
    function createAlternativeCards(alternatives) {
        if (!Array.isArray(alternatives) || alternatives.length === 0) {
            return '<div class="no-alternatives">No alternatives found.</div>';
        }

        return alternatives.map((alt, index) => {
            const name = alt.name || 'Unknown Service';
            const url = alt.url || '#';
            const description = alt.description || '';
            const chatQuery = encodeURIComponent(`Tell me more about ${name}`);
            const chatUrl = `https://saipiens.osc-fr1.scalingo.io/chat?query=${chatQuery}&new=true`;
            
            return `
                <div class="alternative-card" data-url="${url}" data-card-index="${index}">
                    <div class="alternative-header">
                        <h4 class="alternative-name">${name}</h4>
                        <div class="alternative-url">${url}</div>
                    </div>
                    ${description ? `<div class="alternative-description">${description}</div>` : ''}
                    <div class="alternative-footer">
                        <span class="alternative-badge">🇪🇺 EU Alternative</span>
                        <div class="alternative-actions">
                            <button class="learn-more-btn" data-chat-url="${chatUrl}" data-name="${name}">
                                💬 Learn More
                            </button>
                            <span class="alternative-arrow">→</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Wait for the page to load completely
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Make request to backend chat API
    async function requestEUAlternatives(query) {
        try {
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Send me an EU alternative for ${query}

Do not use web search! Answer imidiatly and return a valid JSON. use this template:

[
  {
    "name": "name of alternative",
    "url": "URL of alternative",
  },
  ...
]

if the URL is none existing; return google url.`,
                    agent_name: "default",
                    reset_history: false,
                    parallel_tools: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response || 'No response received';
        } catch (error) {
            console.error('Error requesting EU alternatives:', error);
            throw error;
        }
    }

    // Attach click event listeners to alternative cards
    function attachCardEventListeners(container) {
        const cards = container.querySelectorAll('.alternative-card[data-url]');
        cards.forEach(card => {
            card.addEventListener('click', function(e) {
                // Don't trigger card click if clicking on a button
                if (e.target.classList.contains('learn-more-btn') || e.target.closest('.learn-more-btn')) {
                    return;
                }
                
                e.preventDefault();
                const url = this.getAttribute('data-url');
                if (url && url !== '#') {
                    window.open(url, '_blank');
                }
            });
            
            // Add keyboard accessibility
            card.setAttribute('tabindex', '0');
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    // Don't trigger if focus is on a button
                    if (e.target.classList.contains('learn-more-btn')) {
                        return;
                    }
                    
                    e.preventDefault();
                    const url = this.getAttribute('data-url');
                    if (url && url !== '#') {
                        window.open(url, '_blank');
                    }
                }
            });
        });

        // Attach event listeners to "Learn More" buttons
        const learnMoreBtns = container.querySelectorAll('.learn-more-btn');
        learnMoreBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent card click
                const chatUrl = this.getAttribute('data-chat-url');
                if (chatUrl) {
                    window.open(chatUrl, '_blank');
                }
            });
            
            // Add keyboard accessibility for buttons
            btn.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    const chatUrl = this.getAttribute('data-chat-url');
                    if (chatUrl) {
                        window.open(chatUrl, '_blank');
                    }
                }
            });
        });
    }

    // Update the custom result with the response
    function updateCustomResultWithResponse(container, response, query) {
        // Parse JSON from the response
        const alternatives = parseJSONFromResponse(response);
        
        if (alternatives && Array.isArray(alternatives)) {
            // Create cards for the alternatives
            const alternativeCards = createAlternativeCards(alternatives);
            
            container.innerHTML = `
                <div class="custom-result-container">
                    <h3 class="custom-result-title">
                        <span class="custom-result-link">🇪🇺 EU Alternatives for "${query}"</span>
                    </h3>
                    <div class="custom-result-url">Found ${alternatives.length} European alternative${alternatives.length !== 1 ? 's' : ''}</div>
                    <div class="custom-result-snippet">
                        <div class="alternatives-grid">
                            ${alternativeCards}
                        </div>
                    </div>
                    <div class="custom-result-badge success">EU Alternatives</div>
                </div>
            `;
            
            // Attach event listeners to the cards
            attachCardEventListeners(container);
        } else {
            // Fallback to original response if JSON parsing fails
            container.innerHTML = `
                <div class="custom-result-container">
                    <h3 class="custom-result-title">
                        <a href="#" class="custom-result-link">EU Alternatives for "${query}"</a>
                    </h3>
                    <div class="custom-result-url">Powered by AI Assistant</div>
                    <div class="custom-result-snippet">
                        ${response}
                    </div>
                    <div class="custom-result-badge">EU Alternatives</div>
                </div>
            `;
        }
    }

    // Update the custom result with error message
    function updateCustomResultWithError(container, query, error) {
        container.innerHTML = `
            <div class="custom-result-container">
                <h3 class="custom-result-title">
                    <a href="#" class="custom-result-link">EU Alternatives for "${query}"</a>
                </h3>
                <div class="custom-result-url">Error occurred</div>
                <div class="custom-result-snippet">
                    Sorry, we couldn't fetch EU alternatives at the moment. Error: ${error.message}
                </div>
                <div class="custom-result-badge error">Error</div>
            </div>
        `;
    }

    // Create custom search result element with loading bar
    function createCustomSearchResult() {
        const query = getSearchQuery();
        const customResult = document.createElement('div');
        customResult.className = 'custom-search-result';
        
        // Initial loading state
        customResult.innerHTML = `
            <div class="custom-result-container">
                <h3 class="custom-result-title">
                    <a href="#" class="custom-result-link">Finding EU Alternatives for "${query}"...</a>
                </h3>
                <div class="custom-result-url">Searching EU alternatives...</div>
                <div class="custom-result-snippet">
                    <div class="loading-text">AI is analyzing your search and finding European alternatives...</div>
                    <div class="loading-bar-container">
                        <div class="loading-bar">
                            <div class="loading-bar-fill"></div>
                        </div>
                        <div class="loading-percentage">0%</div>
                    </div>
                </div>
                <div class="custom-result-badge loading">Searching...</div>
            </div>
        `;

        // Start the loading animation and API request
        setTimeout(() => {
            startLoadingAndRequest(customResult, query);
        }, 100);

        return customResult;
    }

    // Start loading animation and make API request
    async function startLoadingAndRequest(customResult, query) {
        const loadingFill = customResult.querySelector('.loading-bar-fill');
        const loadingPercentage = customResult.querySelector('.loading-percentage');
        const container = customResult.querySelector('.custom-result-container');

        // Animation state
        let isAccelerated = false;
        let accelerationStartTime = null;
        let accelerationStartProgress = 0;
        let loadingInterval;

        // Start loading animation
        const startTime = Date.now();
        
        function updateLoadingBar() {
            const currentTime = Date.now();
            let progress;
            
            if (isAccelerated && accelerationStartTime) {
                // Accelerated mode: 10x faster
                const acceleratedElapsed = currentTime - accelerationStartTime;
                const acceleratedDuration = (100 - accelerationStartProgress) * (LOADING_DURATION / 100) / 10; // 10x faster
                const acceleratedProgress = (acceleratedElapsed / acceleratedDuration) * (100 - accelerationStartProgress);
                progress = Math.min(accelerationStartProgress + acceleratedProgress, 100);
            } else {
                // Normal mode
                const elapsed = currentTime - startTime;
                progress = Math.min((elapsed / LOADING_DURATION) * 100, 100);
            }
            
            if (loadingFill && loadingPercentage) {
                loadingFill.style.width = `${progress}%`;
                loadingPercentage.textContent = `${Math.round(progress)}%`;
            }

            if (progress >= 100) {
                clearInterval(loadingInterval);
                return true; // Animation complete
            }
            return false; // Animation continuing
        }
        
        loadingInterval = setInterval(updateLoadingBar, 50);

        try {
            // Make the API request
            const response = await requestEUAlternatives(query);
            
            // Accelerate loading animation if not already complete
            if (!isAccelerated) {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const currentProgress = Math.min((elapsed / LOADING_DURATION) * 100, 100);
                
                if (currentProgress < 100) {
                    isAccelerated = true;
                    accelerationStartTime = currentTime;
                    accelerationStartProgress = currentProgress;
                    
                    // Update interval to be more responsive during acceleration
                    clearInterval(loadingInterval);
                    loadingInterval = setInterval(() => {
                        if (updateLoadingBar()) {
                            // Animation complete, update with response
                            updateCustomResultWithResponse(container, response, query);
                        }
                    }, 5); // 10x faster updates
                } else {
                    // Loading already complete, update immediately
                    clearInterval(loadingInterval);
                    updateCustomResultWithResponse(container, response, query);
                }
            }

        } catch (error) {
            // Clear loading interval
            clearInterval(loadingInterval);

            // Update with error message
            updateCustomResultWithError(container, query, error);
        }
    }

    // Insert custom results above existing search results
    async function insertCustomResults() {
        try {
            // Wait for the search container with id="search"
            const searchContainer = await waitForElement('#search');
            
            if (!searchContainer) {
                console.log('Search container not found');
                return;
            }

            // Check if we already added our custom result
            if (document.querySelector('.custom-search-result')) {
                console.log('Custom result already exists');
                return;
            }

            // Only create custom result if there's a search query
            const query = getSearchQuery();
            if (!query.trim()) {
                console.log('No search query found');
                return;
            }

            // Create and insert the custom result
            const customResult = createCustomSearchResult();
            
            // Append as first child
            searchContainer.prepend(customResult);

            console.log('Custom search result inserted successfully');

        } catch (error) {
            console.error('Error inserting custom search result:', error);
        }
    }

    // Initialize the extension
    function init() {
        // Check if we're on a Google search results page
        if (window.location.hostname.includes('google.com') && 
            window.location.pathname === '/search') {
            
            console.log('Google Search Enhancer: Initializing...');
            
            // Insert custom results when page loads
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', insertCustomResults);
            } else {
                insertCustomResults();
            }

            // Also watch for dynamic content changes (AJAX navigation)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Debounce to avoid multiple insertions
                        clearTimeout(window.customResultTimeout);
                        window.customResultTimeout = setTimeout(insertCustomResults, 500);
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Start the extension
    init();
})();

