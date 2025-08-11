// Product Safety Insights - Frontend JavaScript
// Connects to backend API at http://localhost:8000

// API Configuration - 支持本地与生产，允许通过 window.API_BASE_URL 覆盖
const API_BASE_URL = (function() {
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
        return window.API_BASE_URL.replace(/\/$/, '');
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';
    }
    // 默认使用同源 /api（可通过 Vercel 重写到后端）
    return `${window.location.origin}/api`;
})();

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const resultsContainer = document.getElementById('resultsContainer');
const resultsCount = document.getElementById('resultsCount');
const totalResults = document.getElementById('totalResults');
const modal = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

// Filter elements
const substanceFilter = document.getElementById('substanceFilter');
const holderFilter = document.getElementById('holderFilter');
const riskLevelFilter = document.getElementById('riskLevelFilter');
const clearFiltersBtn = document.getElementById('clearFilters');

// Stats elements
const totalProductsElement = document.getElementById('totalProducts');
const flaggedProductsElement = document.getElementById('flaggedProducts');
const apiStatusElement = document.getElementById('apiStatus');

// Current search mode and results
let currentSearchMode = 'name';
let currentResults = [];
let allProducts = [];


// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    checkApiConnection();
    loadInitialData();
    loadIngredientData();
    updateSearchPlaceholder();
}

function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Filter functionality
    substanceFilter.addEventListener('change', applyFilters);
    holderFilter.addEventListener('change', applyFilters);
    riskLevelFilter.addEventListener('change', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Modal functionality
    closeModal.addEventListener('click', closeProductModal);
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeProductModal();
        }
    });

    // Mobile navigation
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                navMenu.classList.remove('active');
            }
        });
    });
}




// API Functions
async function checkApiConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            updateApiStatus('connected', `Connected - ${data.totalRecords} products in database`);
            totalProductsElement.textContent = data.totalRecords;
            flaggedProductsElement.textContent = data.totalRecords; // All products in this DB are flagged
        } else {
            throw new Error('API health check failed');
        }
    } catch (error) {
        console.error('API connection failed:', error);
        updateApiStatus('disconnected', 'API connection failed');
        totalProductsElement.textContent = 'N/A';
        flaggedProductsElement.textContent = 'N/A';
    }
}

async function loadInitialData() {
    try {
        const response = await fetch(`${API_BASE_URL}/cosmetic_notifications_cancelled?limit=100`);
        const data = await response.json();
        
        if (data.success) {
            allProducts = data.data;
            populateFilters(allProducts);
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

function populateFilters(products) {
    // Populate holder/brand filter
    const holders = [...new Set(products.map(p => p.holder))].sort();
    holderFilter.innerHTML = '<option value="">All Brands</option>';
    holders.forEach(holder => {
        const option = document.createElement('option');
        option.value = holder;
        option.textContent = holder;
        holderFilter.appendChild(option);
    });
}

function updateApiStatus(status, message) {
    apiStatusElement.className = `status-indicator ${status}`;
    apiStatusElement.innerHTML = `<i class="fas fa-circle"></i> ${message}`;
}

// Search Functions
function switchTab(mode) {
    currentSearchMode = mode;
    
    // Update tab buttons
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${mode}"]`).classList.add('active');
    
    // Update placeholder
    updateSearchPlaceholder();
    
    // Clear search input and results
    searchInput.value = '';
    clearResults();
}

function updateSearchPlaceholder() {
    const placeholders = {
        'name': 'Enter product name (e.g., DELUXE, YANKO)...',
        'notification': 'Enter notification number (e.g., NOT200603276K)...'
    };
    searchInput.placeholder = placeholders[currentSearchMode];
}

async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a search term', 'warning');
        return;
    }

    showLoading();
    
    try {
        let endpoint;
        if (currentSearchMode === 'name') {
            endpoint = `${API_BASE_URL}/search/product?q=${encodeURIComponent(query)}`;
        } else {
            endpoint = `${API_BASE_URL}/search/notification?notif_no=${encodeURIComponent(query)}`;
        }
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.success) {
            currentResults = data.data;
            displayResults(currentResults);
        } else {
            throw new Error(data.message || 'Search failed');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showNoResults();
        showNotification('Search failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function applyFilters() {
    if (currentResults.length === 0) return;
    
    let filteredResults = [...currentResults];
    
    // Filter by substance
    if (substanceFilter.value) {
        filteredResults = filteredResults.filter(product => 
            product.substance_detected && 
            product.substance_detected.toUpperCase().includes(substanceFilter.value)
        );
    }
    
    // Filter by holder/brand
    if (holderFilter.value) {
        filteredResults = filteredResults.filter(product => 
            product.holder === holderFilter.value
        );
    }
    
    // Filter by risk level
    if (riskLevelFilter.value) {
        filteredResults = filteredResults.filter(product => {
            const riskLevel = determineRiskLevel(product.substance_detected);
            return riskLevel === riskLevelFilter.value;
        });
    }
    
    displayFilteredResults(filteredResults);
}

function clearFilters() {
    substanceFilter.value = '';
    holderFilter.value = '';
    riskLevelFilter.value = '';
    
    if (currentResults.length > 0) {
        displayFilteredResults(currentResults);
    }
}

// Display Functions
function showLoading() {
    loadingSpinner.style.display = 'block';
    noResults.style.display = 'none';
    resultsContainer.innerHTML = '';
    resultsCount.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showNoResults() {
    noResults.style.display = 'block';
    resultsContainer.innerHTML = '';
    resultsCount.style.display = 'none';
}

function clearResults() {
    hideLoading();
    noResults.style.display = 'none';
    resultsContainer.innerHTML = '';
    resultsCount.style.display = 'none';
    currentResults = [];
}

function displayResults(results) {
    displayFilteredResults(results);
}

function displayFilteredResults(results) {
    hideLoading();
    
    if (results.length === 0) {
        showNoResults();
        return;
    }
    
    noResults.style.display = 'none';
    resultsCount.style.display = 'block';
    totalResults.textContent = results.length;
    
    resultsContainer.innerHTML = results.map(product => createProductCard(product)).join('');
    
    // Add click listeners to product cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function() {
            const productData = JSON.parse(this.dataset.product);
            showProductDetails(productData);
        });
    });
}

function createProductCard(product) {
    const riskLevel = determineRiskLevel(product.substance_detected);
    const riskIndicator = getRiskIndicator(riskLevel);
    
    return `
        <div class="product-card" data-product='${JSON.stringify(product)}'>
            <div class="product-header">
                <div class="product-info">
                    <h3>${product.product}</h3>
                    <p><strong>Brand/Holder:</strong> ${product.holder}</p>
                    <p><strong>Manufacturer:</strong> ${product.manufacturer}</p>
                    <p><strong>Notification Number:</strong> ${product.notif_no}</p>
                </div>
                ${riskIndicator}
            </div>
            
            <div class="status-badge">
                <i class="fas fa-ban"></i>
                Cancelled - Unsafe
            </div>
            
            ${product.substance_detected ? `
                <div class="harmful-substance">
                    <h4><i class="fas fa-exclamation-triangle"></i> Harmful Substance Detected</h4>
                    <div class="substance-info">
                        <strong>${product.substance_detected}</strong> - This substance has been flagged as unsafe for cosmetic use.
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function determineRiskLevel(substance) {
    if (!substance) return 'medium';
    
    const highRiskSubstances = ['MERCURY', 'HYDROQUINONE', 'TRETINOIN'];
    const mediumRiskSubstances = ['STEROID', 'CLINDAMYCIN'];
    
    const substanceUpper = substance.toUpperCase();
    
    if (highRiskSubstances.some(risk => substanceUpper.includes(risk))) {
        return 'high';
    } else if (mediumRiskSubstances.some(risk => substanceUpper.includes(risk))) {
        return 'medium';
    }
    
    return 'high'; // Default to high risk for cancelled products
}

function getRiskIndicator(riskLevel) {
    const indicators = {
        'high': { class: 'risk-high', icon: 'fa-times-circle', text: 'High Risk' },
        'medium': { class: 'risk-medium', icon: 'fa-exclamation-triangle', text: 'Medium Risk' },
        'low': { class: 'risk-low', icon: 'fa-check-circle', text: 'Low Risk' }
    };
    
    const indicator = indicators[riskLevel] || indicators['high'];
    return `
        <div class="risk-indicator ${indicator.class}">
            <i class="fas ${indicator.icon}"></i>
            ${indicator.text}
        </div>
    `;
}

// Modal Functions
function showProductDetails(product) {
    const riskLevel = determineRiskLevel(product.substance_detected);
    const riskIndicator = getRiskIndicator(riskLevel);
    const substanceInfo = getSubstanceInfo(product.substance_detected);
    const recommendations = getRecommendations(product.substance_detected);
    
    const modalHTML = `
        <div class="modal-product-header">
            <h2>${product.product}</h2>
            <div class="modal-product-info">
                <div>
                    <p><strong>Brand/Holder:</strong> ${product.holder}</p>
                    <p><strong>Manufacturer:</strong> ${product.manufacturer}</p>
                    <p><strong>Notification Number:</strong> ${product.notif_no}</p>
                </div>
                <div>
                    ${riskIndicator}
                    <div class="status-badge" style="margin-top: 1rem;">
                        <i class="fas fa-ban"></i>
                        Product Cancelled - Unsafe for Use
                    </div>
                </div>
            </div>
        </div>
        
        ${product.substance_detected ? `
            <div class="modal-risk-section">
                <h3><i class="fas fa-exclamation-triangle"></i> Why This Product Was Cancelled</h3>
                <p><strong>Harmful Substance Detected:</strong> ${product.substance_detected}</p>
                <p><strong>Health Risk:</strong> ${substanceInfo.description}</p>
                <p><strong>Safety Concern:</strong> ${substanceInfo.effects}</p>
                <p><strong>Regulatory Action:</strong> This product has been cancelled by NPRA Malaysia due to the presence of harmful substances that pose health risks to consumers.</p>
            </div>
        ` : ''}
        
        <div class="recommendations-section">
            <h3><i class="fas fa-lightbulb"></i> Safer Alternatives</h3>
            <p>Instead of using products with harmful substances, consider these safer options:</p>
            <div class="recommendation-grid">
                ${recommendations.map(rec => `
                    <div class="recommendation-item">
                        <h4>${rec.category}</h4>
                        <p><strong>Recommended:</strong> ${rec.alternative}</p>
                        <p><strong>Benefits:</strong> ${rec.benefits}</p>
                        <p style="color: #28a745;"><strong>✓ Safe for regular use</strong></p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modalContent.innerHTML = modalHTML;
    modal.style.display = 'block';
}

function closeProductModal() {
    modal.style.display = 'none';
}

// Ingredient Information Functions
function getSubstanceInfo(substance) {
    const substanceDatabase = {
        'MERCURY': {
            description: 'Highly toxic heavy metal that can cause severe neurological and kidney damage.',
            effects: 'Can cause skin discoloration, tremors, memory loss, and kidney problems. Banned in cosmetics worldwide.'
        },
        'HYDROQUINONE': {
            description: 'Can cause skin irritation and ochronosis (blue-black skin discoloration).',
            effects: 'May cause permanent skin darkening, irritation, and increased cancer risk with prolonged use.'
        },
        'TRETINOIN': {
            description: 'Prescription-only retinoid that can cause severe skin reactions.',
            effects: 'Can cause severe skin irritation, increased sun sensitivity, and birth defects during pregnancy.'
        },
        'STEROID': {
            description: 'Topical steroids can cause skin thinning and hormonal disruption.',
            effects: 'Long-term use can cause skin atrophy, stretch marks, and systemic hormonal effects.'
        },
        'CLINDAMYCIN': {
            description: 'Antibiotic that should only be used under medical supervision.',
            effects: 'Can cause antibiotic resistance and serious digestive tract infections.'
        }
    };
    
    if (!substance) {
        return {
            description: 'Unknown harmful substance detected.',
            effects: 'Potential health risks unknown - product cancelled as precautionary measure.'
        };
    }
    
    for (const [key, info] of Object.entries(substanceDatabase)) {
        if (substance.toUpperCase().includes(key)) {
            return info;
        }
    }
    
    return {
        description: 'Harmful substance not approved for cosmetic use.',
        effects: 'This substance has been flagged by regulatory authorities as unsafe for consumer products.'
    };
}

function getRecommendations(substance) {
    const recommendationDatabase = {
        'MERCURY': [
            {
                category: 'Skin Brightening',
                alternative: 'Vitamin C serums or kojic acid products',
                benefits: 'Natural brightening without toxic effects'
            },
            {
                category: 'Even Skin Tone',
                alternative: 'Niacinamide (Vitamin B3) products',
                benefits: 'Reduces dark spots safely and effectively'
            }
        ],
        'HYDROQUINONE': [
            {
                category: 'Dark Spot Treatment',
                alternative: 'Arbutin or glycolic acid products',
                benefits: 'Gentle skin lightening without side effects'
            },
            {
                category: 'Hyperpigmentation',
                alternative: 'Vitamin C and retinol products',
                benefits: 'Safe and effective for long-term use'
            }
        ],
        'TRETINOIN': [
            {
                category: 'Anti-Aging',
                alternative: 'Over-the-counter retinol products',
                benefits: 'Gentler alternative with fewer side effects'
            },
            {
                category: 'Acne Treatment',
                alternative: 'Salicylic acid or benzoyl peroxide',
                benefits: 'Effective acne treatment without prescription risks'
            }
        ]
    };
    
    if (!substance) {
        return [
            {
                category: 'General Skincare',
                alternative: 'Products from reputable, regulated brands',
                benefits: 'Ensure safety and efficacy through proper testing'
            }
        ];
    }
    
    for (const [key, recs] of Object.entries(recommendationDatabase)) {
        if (substance.toUpperCase().includes(key)) {
            return recs;
        }
    }
    
    return [
        {
            category: 'Safe Alternative',
            alternative: 'Consult with dermatologist or pharmacist',
            benefits: 'Professional guidance for safe product selection'
        },
        {
            category: 'General Safety',
            alternative: 'Choose products from regulated manufacturers',
            benefits: 'Ensure compliance with safety standards'
        }
    ];
}

// Ingredient Data Loading
async function loadIngredientData() {
    loadFlaggedIngredients();
    loadIngredientTrends();
}

function loadFlaggedIngredients() {
    const flaggedIngredients = [
        {
            name: 'Mercury',
            description: 'Highly toxic heavy metal banned in cosmetics worldwide. Can cause severe neurological and kidney damage.',
            commonIn: 'Skin lightening creams, some traditional remedies',
            riskLevel: 'HIGH'
        },
        {
            name: 'Hydroquinone',
            description: 'Can cause ochronosis (permanent blue-black skin discoloration) and skin irritation.',
            commonIn: 'Whitening creams, spot treatments',
            riskLevel: 'HIGH'
        },
        {
            name: 'Tretinoin',
            description: 'Prescription-only retinoid that can cause severe skin reactions and birth defects.',
            commonIn: 'Anti-aging creams, acne treatments',
            riskLevel: 'HIGH'
        },
        {
            name: 'Steroids',
            description: 'Can cause skin thinning, stretch marks, and hormonal disruption with prolonged use.',
            commonIn: 'Skin lightening products, anti-inflammatory creams',
            riskLevel: 'MEDIUM'
        },
        {
            name: 'Clindamycin',
            description: 'Antibiotic that should only be used under medical supervision to prevent resistance.',
            commonIn: 'Acne treatments, antibacterial creams',
            riskLevel: 'MEDIUM'
        }
    ];
    
    const container = document.getElementById('flaggedIngredientsGrid');
    container.innerHTML = flaggedIngredients.map(ingredient => `
        <div class="ingredient-item">
            <h4>${ingredient.name} <span style="font-size: 0.8em; color: #dc3545;">(${ingredient.riskLevel} RISK)</span></h4>
            <p><strong>Health Risk:</strong> ${ingredient.description}</p>
            <p><strong>Commonly found in:</strong> ${ingredient.commonIn}</p>
        </div>
    `).join('');
}

function loadIngredientTrends() {
    const ingredientTrends = [
        {
            ingredient: 'Mercury',
            trend: 'falling',
            reason: 'Increased global bans and consumer awareness',
            source: 'WHO Safety Reports 2024'
        },
        {
            ingredient: 'Hydroquinone',
            trend: 'falling',
            reason: 'Stricter regulations and safer alternatives available',
            source: 'FDA Safety Alerts 2024'
        },
        {
            ingredient: 'Illegal Steroids',
            trend: 'stable',
            reason: 'Ongoing enforcement efforts by regulatory bodies',
            source: 'NPRA Malaysia 2024'
        },
        {
            ingredient: 'Natural Alternatives',
            trend: 'rising',
            reason: 'Growing demand for safer, plant-based ingredients',
            source: 'Beauty Industry Report 2024'
        }
    ];
    
    const container = document.getElementById('ingredientTrendsList');
    container.innerHTML = ingredientTrends.map(trend => `
        <div class="trend-item">
            <div class="trend-info">
                <h4>${trend.ingredient}</h4>
                <p>${trend.reason}</p>
                <small><strong>Source:</strong> ${trend.source}</small>
            </div>
            <div class="trend-indicator trend-${trend.trend}">
                <i class="fas fa-arrow-${trend.trend === 'rising' ? 'up' : trend.trend === 'falling' ? 'down' : 'right'}"></i>
                ${trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
            </div>
        </div>
    `).join('');
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 3000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(style);

console.log('Product Safety Insights application loaded successfully!');


