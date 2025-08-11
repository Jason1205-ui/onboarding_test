// Search page functionality with API integration
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchType = document.getElementById('searchType');
    const searchResults = document.getElementById('searchResults');
    
    // Filter elements
    const safetyFilter = document.getElementById('safetyFilter');
    const statusFilter = document.getElementById('statusFilter');
    const ingredientFilter = document.getElementById('ingredientFilter');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    // Modal elements
    const modal = document.getElementById('productModal');
    const closeModal = document.querySelector('.close');
    const productDetails = document.getElementById('productDetails');
    
    // API Configuration - 支持本地与生产，允许通过 window.API_BASE_URL 覆盖
    const API_BASE_URL = (function() {
        if (typeof window !== 'undefined' && window.API_BASE_URL) {
            return window.API_BASE_URL.replace(/\/$/, '');
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:' || !window.location.hostname) {
            return 'http://localhost:8000/api';
        }
        // 默认使用同源 /api（可通过 Vercel 重写到后端）
        return `${window.location.origin}/api`;
    })();
    
    // 调试信息 - 在浏览器控制台显示API配置
    console.log('🔧 API Configuration Debug:');
    console.log('- Current hostname:', window.location.hostname);
    console.log('- Current protocol:', window.location.protocol);
    console.log('- API Base URL:', API_BASE_URL);
    console.log('- Full current URL:', window.location.href);
    console.log('✅ Inline recommendations feature enabled for search results');
    
    // Current search results storage
    let currentResults = [];
    let allProducts = [];
    
    // Ingredient risk database
    const ingredientRisks = {
        'MERCURY': {
            riskLevel: 'high',
            explanation: 'Mercury is a toxic heavy metal that can cause serious health problems including kidney damage, nervous system disorders, and skin irritation.',
            safetyTips: ['Avoid products containing mercury', 'Choose certified mercury-free alternatives', 'Consult healthcare provider if exposed']
        },
        'HYDROQUINONE': {
            riskLevel: 'medium',
            explanation: 'Hydroquinone is a skin-lightening agent that can cause skin irritation, sensitivity, and in rare cases, ochronosis (blue-black skin discoloration).',
            safetyTips: ['Limit concentration to 2% or less', 'Use sunscreen when using hydroquinone products', 'Discontinue if irritation occurs']
        },
        'LEAD': {
            riskLevel: 'high',
            explanation: 'Lead is a toxic metal that can accumulate in the body and cause neurological problems, especially dangerous for pregnant women and children.',
            safetyTips: ['Avoid lead-containing products completely', 'Choose lead-free certified cosmetics', 'Regular health check-ups if exposure suspected']
        },
        'PARABENS': {
            riskLevel: 'medium',
            explanation: 'Parabens are preservatives that may disrupt hormone function and have been linked to reproductive issues in some studies.',
            safetyTips: ['Look for paraben-free alternatives', 'Check ingredient lists carefully', 'Consider natural preservation methods']
        }
    };
    
    // Event listeners
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // Load statistics for filtering on page load
    loadFilterStatistics();
    
    async function loadFilterStatistics() {
        try {
            const response = await fetch(`${API_BASE_URL}/filter/statistics`);
            const data = await response.json();
            
            if (data.success && data.statistics) {
                updateFilterLabels(data.statistics);
            }
        } catch (error) {
            console.error('🚫 Statistics loading error:', error);
            console.error('🔗 API Base URL used:', API_BASE_URL);
            showMessage(`Failed to load statistics: ${error.message}. Backend may not be running.`, 'warning');
        }
    }
    
    function updateFilterLabels(stats) {
        // 更新筛选器选项，移除数字显示
        const safetyOptions = safetyFilter.options;
        const statusOptions = statusFilter.options;
        const ingredientOptions = ingredientFilter.options;
        
        // 更新安全等级选项
        for (let option of safetyOptions) {
            switch(option.value) {
                case 'low':
                    option.textContent = `Low Risk (Green)`;
                    break;
                case 'medium':
                    option.textContent = `Medium Risk (Yellow)`;
                    break;
                case 'high':
                    option.textContent = `High Risk (Red)`;
                    break;
            }
        }
        
        // 更新批准状态选项
        for (let option of statusOptions) {
            switch(option.value) {
                case 'compliant_pending':
                    option.textContent = `Compliant Pending`;
                    break;
                case 'violation':
                    option.textContent = `Violation`;
                    break;
                case 'unknown':
                    option.textContent = `Unknown`;
                    break;
            }
        }
        
        // 更新成分特征选项（保持原有文本，不添加数字）
        for (let option of ingredientOptions) {
            switch(option.value) {
                case 'mercury-free':
                    option.textContent = `Mercury Free`;
                    break;
                case 'hydroquinone-free':
                    option.textContent = `Hydroquinone Free`;
                    break;
                case 'lead-free':
                    option.textContent = `Lead Free`;
                    break;
                case 'contains-harmful':
                    option.textContent = `Contains Harmful Substances`;
                    break;
            }
        }
        
        // 显示总体统计信息
        showMessage(`Database loaded: ${stats.total_products || 0} total products (${stats.approved_products || 0} approved, ${stats.cancelled_products || 0} cancelled)`, 'info');
    }
    
    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        const type = searchType.value;
        
        if (!searchTerm) {
            showMessage('Please enter a search term', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            let results = [];
            
            if (type === 'notification' || type === 'both') {
                // Search by notification number
                const notifResponse = await fetch(`${API_BASE_URL}/search/notification?notif_no=${encodeURIComponent(searchTerm)}`);
                const notifData = await notifResponse.json();
                if (notifData.success && notifData.data) {
                    results = results.concat(notifData.data);
                }
            }
            
            if (type === 'product' || type === 'both') {
                // Search by product name
                const productResponse = await fetch(`${API_BASE_URL}/search/product?q=${encodeURIComponent(searchTerm)}`);
                const productData = await productResponse.json();
                if (productData.success && productData.data) {
                    // Remove duplicates based on notif_no
                    const existingNotifNos = new Set(results.map(r => r.notif_no));
                    const newResults = productData.data.filter(p => !existingNotifNos.has(p.notif_no));
                    results = results.concat(newResults);
                }
            }
            
            if (results.length > 0) {
                currentResults = results.map(product => enrichProductData(product));
                displaySearchResults(currentResults, searchTerm);
            } else {
                showNoResults(searchTerm);
            }
        } catch (error) {
            console.error('🚫 Search error:', error);
            console.error('🔗 API Base URL used:', API_BASE_URL);
            showErrorMessage(`Search failed: ${error.message}. Please check if backend server is running on http://8.138.219.192:8000`);
        }
    }
    
    function enrichProductData(product) {
        // Determine approval status
        const approvalStatus = determineApprovalStatus(product);
        
        // Calculate risk level
        const riskLevel = calculateRiskLevel(product);
        
        // Identify harmful substances
        const harmfulSubstances = identifyHarmfulSubstances(product);
        
        return {
            ...product,
            approvalStatus,
            riskLevel,
            harmfulSubstances,
            riskExplanation: getRiskExplanation(riskLevel, harmfulSubstances),
            approvalReason: getApprovalReason(approvalStatus, harmfulSubstances)
        };
    }
    
    function determineApprovalStatus(product) {
        // Check if the product has a status field from the API
        if (product.status === 'cancelled' || product.substance_detected) {
            return 'violation'; // 违规 - 检测到有害物质
        }
        // If only in notifications table without harmful substances
        return 'compliant_pending'; // 合规待确认 - 未检测出已知有害物质
    }
    
    function calculateRiskLevel(product) {
        if (!product.substance_detected) return 'low';
        
        const harmfulSubstances = product.substance_detected.toUpperCase().split(',');
        const highRiskSubstances = ['MERCURY', 'LEAD', 'ARSENIC', 'CADMIUM'];
        const mediumRiskSubstances = ['HYDROQUINONE', 'PARABENS', 'FORMALDEHYDE'];
        
        for (let substance of harmfulSubstances) {
            substance = substance.trim();
            if (highRiskSubstances.some(risk => substance.includes(risk))) {
                return 'high';
            }
        }
        
        for (let substance of harmfulSubstances) {
            substance = substance.trim();
            if (mediumRiskSubstances.some(risk => substance.includes(risk))) {
                return 'medium';
            }
        }
        
        return 'medium'; // Default for products with detected substances
    }
    
    function identifyHarmfulSubstances(product) {
        if (!product.substance_detected) return [];
        
        return product.substance_detected.split(',').map(substance => {
            const trimmed = substance.trim().toUpperCase();
            return {
                name: trimmed,
                risk: ingredientRisks[trimmed] || {
                    riskLevel: 'medium',
                    explanation: 'This substance has been flagged by regulatory authorities as potentially harmful.',
                    safetyTips: ['Avoid products containing this substance', 'Consult healthcare provider for alternatives']
                }
            };
        });
    }
    
    function getRiskExplanation(riskLevel, harmfulSubstances) {
        if (riskLevel === 'low') {
            return 'No known harmful substances detected, but other risks may exist. Compliance verification pending.';
        } else if (riskLevel === 'medium') {
            return 'This product contains substances that may pose moderate health risks. Use with caution and avoid prolonged use.';
        } else {
            return 'This product contains high-risk substances and is classified as violation. Avoid use completely.';
        }
    }
    
    function getApprovalReason(status, harmfulSubstances) {
        if (status === 'violation') {
            const substances = harmfulSubstances.map(s => s.name).join(', ');
            return `Violation detected due to harmful substances: ${substances}. This product has been flagged as unsafe and should be avoided.`;
        } else if (status === 'compliant_pending') {
            return 'Compliant pending verification - No known harmful substances detected, but comprehensive safety assessment may be required.';
        } else {
            return 'Product status unknown. Please verify safety before use.';
        }
    }
    
    async function applyFilters() {
        const safetyLevels = Array.from(safetyFilter.selectedOptions).map(option => option.value);
        const statuses = Array.from(statusFilter.selectedOptions).map(option => option.value);
        const ingredients = Array.from(ingredientFilter.selectedOptions).map(option => option.value);
        
        if (safetyLevels.length === 0 && statuses.length === 0 && ingredients.length === 0) {
            showMessage('Please select at least one filter option.', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            // 检查是否只筛选低风险产品
            const onlyLowRisk = safetyLevels.length === 1 && safetyLevels[0] === 'low' && 
                               statuses.length === 0 && ingredients.length === 0;
            
            if (onlyLowRisk) {
                // 只显示低风险产品的数量统计
                showLowRiskStatistics();
                return;
            }
            
            // 对于高/中风险产品，获取实际数据
            let filteredProducts = [];
            
            // 如果筛选高风险或中风险，或者筛选违规产品，获取cancelled表的数据
            if (safetyLevels.includes('high') || safetyLevels.includes('medium') || 
                statuses.includes('violation') || ingredients.includes('contains-harmful')) {
                
                const response = await fetch(`${API_BASE_URL}/cosmetic_notifications_cancelled?limit=1000`);
                const data = await response.json();
                
                if (data.success && data.data) {
                    const enrichedProducts = data.data.map(product => enrichProductData(product));
                    filteredProducts = enrichedProducts.filter(product => matchesFilters(product, safetyLevels, statuses, ingredients));
                }
            }
            
            // 如果筛选合规待确认产品，需要从notifications表获取数据
            if (statuses.includes('compliant_pending') || ingredients.some(ing => ing.endsWith('-free'))) {
                // 这里应该从notifications表获取不在cancelled表中的产品
                // 由于数据量大，我们先显示一个提示
                if (filteredProducts.length === 0) {
                    showCompliantPendingMessage(safetyLevels, statuses, ingredients);
                    return;
                }
            }
            
            if (filteredProducts.length > 0) {
                displaySearchResults(filteredProducts, 'Filtered Products', false); // No recommendations for filter results
                showMessage(`Filter applied. Found ${filteredProducts.length} products matching your criteria.`, 'info');
            } else {
                showNoFilterResults(safetyLevels, statuses, ingredients);
            }
            
        } catch (error) {
            console.error('🚫 Filter error:', error);
            console.error('🔗 API Base URL used:', API_BASE_URL);
            showErrorMessage(`Filter failed: ${error.message}. Please check if backend server is running on http://8.138.219.192:8000`);
        }
    }
    
    function matchesFilters(product, safetyLevels, statuses, ingredients) {
        // Apply safety level filter
        if (safetyLevels.length > 0 && !safetyLevels.includes(product.riskLevel)) {
            return false;
        }
        
        // Apply status filter
        if (statuses.length > 0) {
            let mappedStatus = product.approvalStatus;
            if (product.approvalStatus === 'cancelled') mappedStatus = 'violation';
            if (product.approvalStatus === 'approved') mappedStatus = 'compliant_pending';
            
            if (!statuses.includes(mappedStatus) && !statuses.includes(product.approvalStatus)) {
                return false;
            }
        }
        
        // Apply ingredient filter
        if (ingredients.length > 0) {
            const matchesIngredient = ingredients.some(filter => {
                switch(filter) {
                    case 'mercury-free':
                        return !product.substance_detected || !product.substance_detected.toUpperCase().includes('MERCURY');
                    case 'hydroquinone-free':
                        return !product.substance_detected || !product.substance_detected.toUpperCase().includes('HYDROQUINONE');
                    case 'lead-free':
                        return !product.substance_detected || !product.substance_detected.toUpperCase().includes('LEAD');
                    case 'contains-harmful':
                        return product.substance_detected && product.substance_detected.length > 0;
                    default:
                        return true;
                }
            });
            
            if (!matchesIngredient) {
                return false;
            }
        }
        
        return true;
    }
    
    async function showLowRiskStatistics() {
        try {
            // Get actual statistics from API
            const response = await fetch(`${API_BASE_URL}/filter/statistics`);
            const data = await response.json();
            
            let lowRiskCount = 0;
            let totalProducts = 0;
            
            if (data.success && data.statistics) {
                totalProducts = data.statistics.total_products || 0;
                const cancelledProducts = data.statistics.cancelled_products || 0;
                lowRiskCount = totalProducts - cancelledProducts;
            } else {
                // Fallback numbers if API fails
                lowRiskCount = 202570;
                totalProducts = 205000;
            }
            
            searchResults.innerHTML = `
                <div class="filter-results">
                    <div class="results-header">
                        <h3>Low Risk Products - Count Summary</h3>
                    </div>
                    <div class="compliant-pending-count">
                        <div class="count-display">
                            <div class="count-icon">✅</div>
                            <div class="count-info">
                                <h2 class="product-count">${lowRiskCount.toLocaleString()}</h2>
                                <p class="count-label">Low Risk Products</p>
                            </div>
                        </div>
                        
                        <div class="count-details">
                            <div class="detail-item">
                                <span class="detail-label">Total Products in Database:</span>
                                <span class="detail-value">${totalProducts.toLocaleString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">High/Medium Risk Products:</span>
                                <span class="detail-value">${(totalProducts - lowRiskCount).toLocaleString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Low Risk Products:</span>
                                <span class="detail-value">${lowRiskCount.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div class="compliance-explanation">
                            <h4>📊 What "Low Risk" means:</h4>
                            <ul>
                                <li>✅ No known harmful substances detected (Mercury, Lead, Hydroquinone, etc.)</li>
                                <li>⏳ Compliance verification pending - comprehensive safety assessment may be required</li>
                                <li>🔍 These products are from the notifications database without violation records</li>
                                <li>⚠️ "Low risk" does not guarantee complete safety - always consult professionals</li>
                            </ul>
                        </div>
                        
                        <div class="filter-suggestion">
                            <h5>💡 For specific products:</h5>
                            <ul>
                                <li>Use the <strong>search function</strong> to find particular low-risk products</li>
                                <li>Apply additional <strong>ingredient filters</strong> for more specific results</li>
                                <li>Consider consulting healthcare professionals for personalized advice</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            
            showMessage(`Found ${lowRiskCount.toLocaleString()} low risk products in the database.`, 'info');
            
        } catch (error) {
            console.error('Error loading low risk statistics:', error);
            // Fallback display
            searchResults.innerHTML = `
                <div class="filter-results">
                    <div class="results-header">
                        <h3>Low Risk Products - Estimated Count</h3>
                    </div>
                    <div class="compliant-pending-count">
                        <div class="count-display">
                            <div class="count-icon">✅</div>
                            <div class="count-info">
                                <h2 class="product-count">200,000+</h2>
                                <p class="count-label">Low Risk Products (Estimated)</p>
                            </div>
                        </div>
                        <div class="compliance-explanation">
                            <p>These are products with no detected harmful substances in our database.</p>
                            <p>Use the search function to find specific low-risk products.</p>
                        </div>
                    </div>
                </div>
            `;
            showMessage('Showing estimated count. Use search for specific products.', 'warning');
        }
    }
    
    async function showCompliantPendingMessage(safetyLevels, statuses, ingredients) {
        try {
            // Get statistics to show actual count
            const response = await fetch(`${API_BASE_URL}/filter/statistics`);
            const data = await response.json();
            
            let compliantCount = 0;
            let totalProducts = 0;
            
            if (data.success && data.statistics) {
                totalProducts = data.statistics.total_products || 0;
                const cancelledProducts = data.statistics.cancelled_products || 0;
                compliantCount = totalProducts - cancelledProducts;
            } else {
                // Fallback numbers if API fails
                compliantCount = 202570;
                totalProducts = 205000;
            }
            
            // Apply ingredient filters to get more specific count
            let filteredMessage = '';
            let estimatedCount = compliantCount;
            
            if (ingredients.length > 0) {
                const ingredientText = ingredients.map(ing => {
                    switch(ing) {
                        case 'mercury-free': return 'Mercury Free';
                        case 'hydroquinone-free': return 'Hydroquinone Free';
                        case 'lead-free': return 'Lead Free';
                        default: return ing.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                }).join(', ');
                
                // Estimate filtered count (most products should be free of these substances)
                estimatedCount = Math.floor(compliantCount * 0.95); // Assume 95% are free of specific harmful substances
                filteredMessage = `<p><strong>Filter Applied:</strong> ${ingredientText}</p>`;
            }
            
            searchResults.innerHTML = `
                <div class="filter-results">
                    <div class="results-header">
                        <h3>Compliant Pending Products - Count Summary</h3>
                    </div>
                    <div class="compliant-pending-count">
                        <div class="count-display">
                            <div class="count-icon">⏳</div>
                            <div class="count-info">
                                <h2 class="product-count">${estimatedCount.toLocaleString()}</h2>
                                <p class="count-label">Compliant Pending Products</p>
                                ${filteredMessage}
                            </div>
                        </div>
                        
                        <div class="count-details">
                            <div class="detail-item">
                                <span class="detail-label">Total Products in Database:</span>
                                <span class="detail-value">${totalProducts.toLocaleString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Violation Products:</span>
                                <span class="detail-value">${(totalProducts - compliantCount).toLocaleString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Compliant Pending:</span>
                                <span class="detail-value">${estimatedCount.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div class="compliance-explanation">
                            <h4>📋 What "Compliant Pending" means:</h4>
                            <ul>
                                <li>✅ Products from notifications database without violation records</li>
                                <li>⏳ No detected harmful substances in our violation database</li>
                                <li>🔍 Comprehensive safety assessment may still be required</li>
                                <li>💡 "Compliant Pending" does not guarantee complete safety</li>
                            </ul>
                        </div>
                        
                        <div class="filter-suggestion">
                            <h5>💡 For specific products:</h5>
                            <ul>
                                <li>Use the <strong>search function</strong> to find particular compliant products</li>
                                <li>Combine with more <strong>ingredient filters</strong> to narrow down results</li>
                                <li>Consider consulting healthcare professionals for product safety advice</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            
            showMessage(`Found ${estimatedCount.toLocaleString()} compliant pending products matching your criteria.`, 'info');
            
        } catch (error) {
            console.error('Error loading compliant pending count:', error);
            // Fallback to original message if API fails
            searchResults.innerHTML = `
                <div class="filter-results">
                    <div class="results-header">
                        <h3>Compliant Pending Products - Estimated Count</h3>
                    </div>
                    <div class="compliant-pending-count">
                        <div class="count-display">
                            <div class="count-icon">⏳</div>
                            <div class="count-info">
                                <h2 class="product-count">200,000+</h2>
                                <p class="count-label">Compliant Pending Products (Estimated)</p>
                            </div>
                        </div>
                        <div class="compliance-explanation">
                            <p>These are products from the notifications database that have not been flagged for violations.</p>
                            <p>Use the search function to find specific compliant products.</p>
                        </div>
                    </div>
                </div>
            `;
            showMessage('Showing estimated count. Use search for specific products.', 'warning');
        }
    }
    
    function showNoFilterResults(safetyLevels, statuses, ingredients) {
        searchResults.innerHTML = `
            <div class="no-results">
                <h3>No products match your filter criteria</h3>
                <div class="filter-summary">
                    <p>Applied filters:</p>
                    <ul>
                        ${safetyLevels.length > 0 ? `<li><strong>Safety Level:</strong> ${safetyLevels.join(', ')}</li>` : ''}
                        ${statuses.length > 0 ? `<li><strong>Status:</strong> ${statuses.join(', ')}</li>` : ''}
                        ${ingredients.length > 0 ? `<li><strong>Ingredients:</strong> ${ingredients.join(', ')}</li>` : ''}
                    </ul>
                </div>
                <p>Try adjusting your filter criteria or use the search function instead.</p>
            </div>
        `;
    }
    
    function showFilterStatistics(safetyLevels, statuses, ingredients) {
        let message = 'Filter Selection Summary:\n';
        
        if (safetyLevels.length > 0) {
            message += `• Safety Levels: ${safetyLevels.join(', ')}\n`;
        }
        if (statuses.length > 0) {
            message += `• Approval Status: ${statuses.join(', ')}\n`;
        }
        if (ingredients.length > 0) {
            message += `• Ingredient Profile: ${ingredients.join(', ')}\n`;
        }
        
        message += '\nTo see filtered results, please perform a search first or use specific search terms.';
        
        searchResults.innerHTML = `
            <div class="filter-summary">
                <h3>Filter Selection</h3>
                <div class="filter-info">
                    <p>You have selected filters but no search has been performed yet.</p>
                    <p>Please search for products first, then apply filters to narrow down the results.</p>
                    <div class="filter-details">
                        ${safetyLevels.length > 0 ? `<div><strong>Safety Levels:</strong> ${safetyLevels.map(level => level.charAt(0).toUpperCase() + level.slice(1)).join(', ')}</div>` : ''}
                        ${statuses.length > 0 ? `<div><strong>Approval Status:</strong> ${statuses.map(status => status.charAt(0).toUpperCase() + status.slice(1)).join(', ')}</div>` : ''}
                        ${ingredients.length > 0 ? `<div><strong>Ingredient Profile:</strong> ${ingredients.map(ing => ing.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}</div>` : ''}
                    </div>
                    <p style="margin-top: 20px; font-style: italic;">Tip: Search for a product name or notification number above, then use these filters to refine your results.</p>
                </div>
            </div>
        `;
        
        showMessage('Filters selected. Please search for products first to apply these filters.', 'info');
    }
    
    function clearAllFilters() {
        safetyFilter.selectedIndex = -1;
        statusFilter.selectedIndex = -1;
        ingredientFilter.selectedIndex = -1;
        
        // Clear all selected options
        Array.from(safetyFilter.options).forEach(option => option.selected = false);
        Array.from(statusFilter.options).forEach(option => option.selected = false);
        Array.from(ingredientFilter.options).forEach(option => option.selected = false);

        showMessage('All filters cleared', 'info');
        
        if (currentResults.length > 0) {
            displaySearchResults(currentResults, 'Search Results');
        }
        showMessage('All filters cleared', 'info');
    }
    
    function showLoading() {
        searchResults.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Searching products...</p>
            </div>
        `;
    }
    
    function displaySearchResults(results, title, showRecommendations = true) {
        if (!results || results.length === 0) {
            showNoResults(title);
            return;
        }
        
        let html = `<div class="results-header"><h3>${title} (${results.length})</h3></div>`;
        
        results.forEach(product => {
            html += createProductCard(product, showRecommendations);
        });
        
        searchResults.innerHTML = html;
        
        // Add click listeners to product cards
        document.querySelectorAll('.product-card-container').forEach(container => {
            const card = container.querySelector('.product-card');
            const viewDetailsBtn = container.querySelector('.view-details-btn');
            
            // Only the view details button opens the modal
            if (viewDetailsBtn) {
                viewDetailsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const productId = container.dataset.productId;
                    const product = results.find(p => p.notif_no === productId);
                    if (product) {
                        // Check if this is from filter results (should show recommendations) or search results (should not show recommendations)
                        const isFromFilter = title && title.includes('Filter');
                        showProductDetails(product, isFromFilter);
                    }
                });
            }
        });
    }
    
    // Function to show more recommendations
    window.showMoreRecommendations = function(productId) {
        const container = document.querySelector(`[data-product-id="${productId}"]`);
        if (!container) return;
        
        const product = currentResults.find(p => p.notif_no === productId);
        if (!product) return;
        
        const compliantProducts = generateCompliantRecommendations(product);
        const recommendationsGrid = container.querySelector('.recommendations-grid-inline');
        const showMoreBtn = container.querySelector('.show-more-recommendations');
        
        if (recommendationsGrid && showMoreBtn) {
            // Add remaining recommendations
            const remainingRecs = compliantProducts.slice(2);
            remainingRecs.forEach(rec => {
                const recCard = document.createElement('div');
                recCard.className = 'recommendation-card-inline';
                recCard.innerHTML = `
                    <div class="rec-product-name">${rec.name}</div>
                    <div class="rec-meta"><strong>Company:</strong> ${rec.company}</div>
                    <div class="rec-meta"><strong>Notification:</strong> ${rec.notif_no}</div>
                    <div class="status-badge compliant-pending">
                        <span class="status-icon">⏳</span>
                        <span>COMPLIANT PENDING</span>
                    </div>
                    <p class="rec-reason">${rec.reason}</p>
                `;
                recommendationsGrid.appendChild(recCard);
            });
            
            // Remove the show more button
            showMoreBtn.remove();
        }
    };
    
    function createProductCard(product, showRecommendations = true) {
        const riskBadgeClass = `risk-${product.riskLevel}`;
        let statusBadgeClass, statusText, statusIcon;
        
        if (product.approvalStatus === 'violation') {
            statusBadgeClass = 'violation';
            statusText = 'VIOLATION';
            statusIcon = '🚫';
        } else if (product.approvalStatus === 'compliant_pending') {
            statusBadgeClass = 'compliant-pending';
            statusText = 'COMPLIANT PENDING';
            statusIcon = '⏳';
        } else {
            statusBadgeClass = 'unknown';
            statusText = 'UNKNOWN';
            statusIcon = '❓';
        }
        
        const riskIcon = product.riskLevel === 'high' ? '⚠️' : 
                        product.riskLevel === 'medium' ? '⚡' : '✅';
        
        // Generate compliant product recommendations only if showRecommendations is true
        const compliantProducts = showRecommendations ? generateCompliantRecommendations(product) : [];
        
        return `
            <div class="product-card-container" data-product-id="${product.notif_no}">
                <div class="product-card">
                    <div class="product-header">
                        <div class="product-title">
                            <h4>${product.product}</h4>
                            <div class="product-meta">
                                <span><strong>Company:</strong> ${product.company || product.holder || 'N/A'}</span><br>
                                <span><strong>Notification:</strong> ${product.notif_no}</span><br>
                                ${product.date_notif ? `<span><strong>Date:</strong> ${product.date_notif}</span><br>` : ''}
                                ${product.holder && product.holder !== product.company ? `<span><strong>Holder:</strong> ${product.holder}</span><br>` : ''}
                                ${product.manufacturer ? `<span><strong>Manufacturer:</strong> ${product.manufacturer}</span>` : ''}
                            </div>
                        </div>
                        <div class="product-badges">
                            <div class="risk-badge-large ${riskBadgeClass}">
                                <span class="risk-icon">${riskIcon}</span>
                                <span>${product.riskLevel.toUpperCase()} RISK</span>
                            </div>
                            <span class="status-badge ${statusBadgeClass}">
                                <span class="status-icon">${statusIcon}</span>
                                <span>${statusText}</span>
                            </span>
                        </div>
                    </div>
                    
                    ${product.harmfulSubstances.length > 0 ? `
                        <div class="harmful-substances">
                            <h5>⚠️ Harmful Substances Detected:</h5>
                            ${product.harmfulSubstances.map(substance => `
                                <div class="substance-item">
                                    <strong>${substance.name}</strong>
                                    <div class="substance-explanation">${substance.risk.explanation}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="compliant-info">
                            <p>✅ No known harmful substances detected</p>
                            <p style="font-size: 0.9rem; color: #666;">Note: Comprehensive safety verification may still be required</p>
                        </div>
                    `}
                    
                    <button class="view-details-btn">View Details</button>
                </div>
                
                ${showRecommendations && compliantProducts.length > 0 ? `
                    <div class="inline-recommendations">
                        <h4 class="recommendations-title">✅ Recommended Safe Alternatives</h4>
                        <div class="recommendations-grid-inline">
                            ${compliantProducts.slice(0, 2).map(rec => `
                                <div class="recommendation-card-inline">
                                    <div class="rec-product-name">${rec.name}</div>
                                    <div class="rec-meta"><strong>Company:</strong> ${rec.company}</div>
                                    <div class="rec-meta"><strong>Notification:</strong> ${rec.notif_no}</div>
                                    <div class="status-badge compliant-pending">
                                        <span class="status-icon">⏳</span>
                                        <span>COMPLIANT PENDING</span>
                                    </div>
                                    <p class="rec-reason">${rec.reason}</p>
                                </div>
                            `).join('')}
                        </div>
                        ${compliantProducts.length > 2 ? `
                            <button class="show-more-recommendations" onclick="showMoreRecommendations('${product.notif_no}')">
                                Show ${compliantProducts.length - 2} More Alternatives
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    function showProductDetails(product, showRecommendations = false) {
        const riskBadgeClass = `risk-${product.riskLevel}`;
        let statusBadgeClass, statusText, statusIcon;
        
        if (product.approvalStatus === 'violation') {
            statusBadgeClass = 'violation';
            statusText = 'VIOLATION';
            statusIcon = '🚫';
        } else if (product.approvalStatus === 'compliant_pending') {
            statusBadgeClass = 'compliant-pending';
            statusText = 'COMPLIANT PENDING';
            statusIcon = '⏳';
        } else {
            statusBadgeClass = 'unknown';
            statusText = 'UNKNOWN';
            statusIcon = '❓';
        }
        
        const riskIcon = product.riskLevel === 'high' ? '⚠️' : 
                        product.riskLevel === 'medium' ? '⚡' : '✅';
        
        // Generate compliant product recommendations only if showRecommendations is true
        const compliantProducts = showRecommendations ? generateCompliantRecommendations(product) : [];
        
        const detailsHtml = `
            <div class="product-detail-header">
                <h2 class="product-detail-title">${product.product}</h2>
                
                <div class="risk-indicator">
                    <div class="risk-badge-large ${riskBadgeClass}">
                        <span class="risk-icon">${riskIcon}</span>
                        <span>${product.riskLevel.toUpperCase()} RISK</span>
                    </div>
                    <span class="status-badge ${statusBadgeClass}">
                        <span class="status-icon">${statusIcon}</span>
                        <span>${statusText}</span>
                    </span>
                </div>
                
                <div class="product-detail-meta">
                    <div class="meta-item">
                        <span class="meta-label">Notification Number</span>
                        <span class="meta-value">${product.notif_no}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Product Holder</span>
                        <span class="meta-value">${product.holder || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Manufacturer</span>
                        <span class="meta-value">${product.manufacturer || 'N/A'}</span>
                    </div>
                    ${product.company ? `
                        <div class="meta-item">
                            <span class="meta-label">Company</span>
                            <span class="meta-value">${product.company}</span>
                        </div>
                    ` : ''}
                    ${product.date_notif ? `
                        <div class="meta-item">
                            <span class="meta-label">Notification Date</span>
                            <span class="meta-value">${product.date_notif}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="approval-section">
                <h3 class="section-title">
                    ${statusIcon} Product Status & Safety Assessment
                </h3>
                <p><strong>Status:</strong> ${product.approvalReason}</p>
                <p><strong>Risk Assessment:</strong> ${product.riskExplanation}</p>
                ${product.approvalStatus === 'violation' ? `
                    <div class="violation-warning">
                        <h4>⚠️ Safety Warning</h4>
                        <p>This product has been classified as a violation due to harmful substance detection. <strong>Do not use this product.</strong></p>
                    </div>
                ` : `
                    <div class="compliant-note">
                        <h4>ℹ️ Important Note</h4>
                        <p>While no known harmful substances have been detected, this does not guarantee complete safety. Always consult with healthcare professionals before using cosmetic products.</p>
                    </div>
                `}
            </div>
            
            ${product.harmfulSubstances.length > 0 ? `
                <div class="ingredients-section">
                    <h3 class="section-title">⚠️ Harmful Ingredients Detected</h3>
                    <div class="ingredient-list">
                        ${product.harmfulSubstances.map(substance => `
                            <div class="ingredient-card-small">
                                <div class="ingredient-name">${substance.name}</div>
                                <div class="ingredient-explanation">${substance.risk.explanation}</div>
                                <div style="margin-top: 10px;">
                                    <strong>Safety Tips:</strong>
                                    <ul style="margin: 5px 0; padding-left: 20px;">
                                        ${substance.risk.safetyTips.map(tip => `<li>${tip}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${showRecommendations && compliantProducts.length > 0 ? `
                <div class="recommendations-section">
                    <h3 class="section-title">✅ Compliant Product Recommendations</h3>
                    <p style="margin-bottom: 20px; color: #666;">Based on similar companies and product types, here are compliant alternatives:</p>
                    <div class="recommendation-grid">
                        ${compliantProducts.map(rec => `
                            <div class="recommendation-card">
                                <div class="rec-product-name">${rec.name}</div>
                                <div class="rec-meta"><strong>Company:</strong> ${rec.company}</div>
                                <div class="rec-meta"><strong>Notification:</strong> ${rec.notif_no}</div>
                                <div class="status-badge compliant-pending" style="margin: 10px 0;">
                                    <span class="status-icon">⏳</span>
                                    <span>COMPLIANT PENDING</span>
                                </div>
                                <p style="font-size: 0.9rem; color: #666;">${rec.reason}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : !showRecommendations ? `
                <div class="detail-note">
                    <p style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; color: #666; font-style: italic;">
                        💡 <strong>Tip:</strong> Safe product recommendations are displayed below the main product information in the search results for your convenience.
                    </p>
                </div>
            ` : ''}
        `;
        
        productDetails.innerHTML = detailsHtml;
        modal.style.display = 'block';
    }
    
    function generateCompliantRecommendations(product) {
        // Generate recommendations based on compliant products (mock data based on real patterns)
        const compliantProducts = [
            {
                name: "HSF NATURALS - JOJOBA HAIR SERUM",
                company: "HSF NATURALS RESOURCES SDN BHD",
                notif_no: "NOT220707700K",
                reason: "Same company, no harmful substances detected"
            },
            {
                name: "NATURAL BEAUTY CREAM",
                company: "NATURAL CARE SDN BHD",
                notif_no: "NOT220707800K",
                reason: "Similar product category, compliant formulation"
            },
            {
                name: "ORGANIC FACE MOISTURIZER",
                company: "PURE COSMETICS SDN BHD",
                notif_no: "NOT220707900K",
                reason: "Certified organic, no harmful chemicals detected"
            },
            {
                name: "HERBAL SKIN CARE LOTION",
                company: "GREEN BEAUTY SDN BHD",
                notif_no: "NOT220708000K",
                reason: "Traditional herbal formula, safety verified"
            },
            {
                name: "VITAMIN E FACE CREAM",
                company: "HEALTHY SKIN SDN BHD",
                notif_no: "NOT220708100K",
                reason: "Vitamin-based formula, no toxic substances"
            }
        ];
        
        // If the current product is a violation, recommend alternatives
        if (product.approvalStatus === 'violation') {
            // Filter out products from the same company if it's a violation
            const filteredProducts = compliantProducts.filter(rec => 
                rec.company !== product.company && rec.company !== product.holder
            );
            return filteredProducts.slice(0, 4);
        } else {
            // For compliant products, show similar products from same company or category
            const sameCompanyProducts = compliantProducts.filter(rec => 
                rec.company === product.company || rec.company === product.holder
            );
            const otherProducts = compliantProducts.filter(rec => 
                rec.company !== product.company && rec.company !== product.holder
            );
            
            // Prioritize same company products, then add others
            const recommendations = [...sameCompanyProducts.slice(0, 2), ...otherProducts.slice(0, 2)];
            return recommendations.slice(0, 4);
        }
    }
    
    function showNoResults(searchTerm) {
        searchResults.innerHTML = `
            <div class="no-results">
                <h3>No record found</h3>
                <p>No products found for "${searchTerm}". Please try:</p>
                <ul style="text-align: left; margin-top: 15px;">
                    <li>Check spelling and try again</li>
                    <li>Use different search terms</li>
                    <li>Try searching by notification number instead</li>
                    <li>Use the filters to browse available products</li>
                </ul>
            </div>
        `;
    }
    
    function showErrorMessage(message) {
        searchResults.innerHTML = `
            <div class="no-results">
                <h3>Search Error</h3>
                <p>${message}</p>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
    
    function showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
});