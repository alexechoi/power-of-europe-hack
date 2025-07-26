// Google Search Enhancer Content Script
(function() {
    'use strict';

    // Configuration
    const BACKEND_URL = 'http://localhost:8000'; // Adjust this to your backend URL
    const LOADING_DURATION = 7000; // 7 seconds

    // Extract search query from URL
    function getSearchQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('q') || '';
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
                    message: `Find me an EU alternatives for ${query}`,
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

    // Update the custom result with the response
    function updateCustomResultWithResponse(container, response, query) {
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

        // Start loading animation
        const startTime = Date.now();
        const loadingInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / LOADING_DURATION) * 100, 100);
            
            if (loadingFill && loadingPercentage) {
                loadingFill.style.width = `${progress}%`;
                loadingPercentage.textContent = `${Math.round(progress)}%`;
            }

            if (progress >= 100) {
                clearInterval(loadingInterval);
            }
        }, 50);

        try {
            // Make the API request
            const response = await requestEUAlternatives(query);
            
            // Wait for loading to complete if API finishes early
            const elapsed = Date.now() - startTime;
            if (elapsed < LOADING_DURATION) {
                await new Promise(resolve => setTimeout(resolve, LOADING_DURATION - elapsed));
            }

            // Clear loading interval
            clearInterval(loadingInterval);

            // Update with the response
            updateCustomResultWithResponse(container, response, query);

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

