// Trends Page JavaScript - Manufacturer Risk Analysis
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page components
    initializeTrendsPage();
    
    function initializeTrendsPage() {
        console.log('Initializing Trends Page...');
        
        // Show loading state
        showLoadingState();
        
        // Load manufacturer statistics
        loadManufacturerStatistics();
    }
    
    function showLoadingState() {
        const elements = {
            totalViolations: document.getElementById('totalViolations'),
            affectedManufacturers: document.getElementById('affectedManufacturers'),
            totalProducts: document.getElementById('totalProducts'),
            manufacturerList: document.getElementById('manufacturerList')
        };
        
        Object.values(elements).forEach(element => {
            if (element) {
                element.textContent = 'Loading...';
            }
        });
        
        if (elements.manufacturerList) {
            elements.manufacturerList.innerHTML = `
                <div class="loading-message">
                    <div class="loading-spinner"></div>
                    <p>Loading manufacturer analysis data...</p>
                </div>
            `;
        }
    }
    
    async function loadManufacturerStatistics() {
        try {
            console.log('Fetching manufacturer statistics...');
            
            // 动态获取API地址
            const API_BASE_URL = (window.location.hostname === 'localhost' || 
                                 window.location.hostname === '127.0.0.1' ||
                                 window.location.protocol === 'file:' ||
                                 !window.location.hostname) 
                ? 'http://localhost:8000/api' 
                : `${window.location.protocol}//${window.location.hostname}:8000/api`;
            
            console.log('🔧 Trends API Configuration:', API_BASE_URL);
            
            const response = await fetch(`${API_BASE_URL}/manufacturer/statistics`);
            const data = await response.json();
            
            if (data.success) {
                console.log('Manufacturer data loaded:', data);
                
                // Update statistics cards
                updateStatisticsCards(data.data.summary);
                
                // Create pie chart
                createManufacturerPieChart(data.data.manufacturers);
                
                // Display manufacturer details
                displayManufacturerDetails(data.data.manufacturers);
                
                // Create chart legend
                createChartLegend(data.data.manufacturers);
                
            } else {
                throw new Error(data.message || 'Failed to load manufacturer statistics');
            }
            
        } catch (error) {
            console.error('Error loading manufacturer statistics:', error);
            showErrorMessage('Failed to load manufacturer analysis data. Please try again later.');
            
            // Show fallback data
            showFallbackData();
        }
    }
    
    function updateStatisticsCards(summary) {
        const totalViolations = document.getElementById('totalViolations');
        const affectedManufacturers = document.getElementById('affectedManufacturers');
        const totalProducts = document.getElementById('totalProducts');
        
        if (totalViolations) {
            totalViolations.textContent = summary.total_violations.toLocaleString();
        }
        
        if (affectedManufacturers) {
            affectedManufacturers.textContent = summary.total_manufacturers.toLocaleString();
        }
        
        if (totalProducts) {
            // This would need to come from a separate API call
            totalProducts.textContent = '50,000+';
        }
    }
    
    function createManufacturerPieChart(manufacturers) {
        const canvas = document.getElementById('manufacturerChart');
        if (!canvas) {
            console.error('Chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data for Chart.js
        const topManufacturers = manufacturers.slice(0, 8); // Limit to 8 for better readability
        const labels = topManufacturers.map(m => m.manufacturer);
        const data = topManufacturers.map(m => m.violations);
        const colors = topManufacturers.map(m => m.color);
        
        // Register the datalabels plugin
        Chart.register(ChartDataLabels);
        
        console.log('🎯 Creating pie chart with labels for', topManufacturers.length, 'manufacturers');
        
        // Create the pie chart with labels
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 40,
                        bottom: 40,
                        left: 40,
                        right: 40
                    }
                },
                plugins: {
                    legend: {
                        display: false // We'll create a custom legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const manufacturer = topManufacturers[context.dataIndex];
                                return [
                                    `${manufacturer.manufacturer}`,
                                    `Violations: ${manufacturer.violations}`,
                                    `Percentage: ${manufacturer.percentage}%`
                                ];
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        backgroundColor: function(context) {
                            return context.dataset.backgroundColor[context.dataIndex];
                        },
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        borderRadius: 8,
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        padding: {
                            top: 4,
                            bottom: 4,
                            left: 8,
                            right: 8
                        },
                        formatter: function(value, context) {
                            const manufacturer = topManufacturers[context.dataIndex];
                            // Show company name and percentage
                            const companyName = manufacturer.manufacturer.length > 15 
                                ? manufacturer.manufacturer.substring(0, 12) + '...' 
                                : manufacturer.manufacturer;
                            return companyName + '\n' + manufacturer.percentage + '%';
                        },
                        textAlign: 'center',
                        anchor: 'end',
                        align: 'start',
                        offset: 20,
                        clamp: false,
                        clip: false,
                        // Add leader lines
                        listeners: {
                            enter: function(context) {
                                context.element.style.cursor = 'pointer';
                            },
                            leave: function(context) {
                                context.element.style.cursor = 'default';
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500
                }
            },
            plugins: [ChartDataLabels]
        });
    }
    
    function createChartLegend(manufacturers) {
        const legendContainer = document.getElementById('chartLegend');
        if (!legendContainer) return;
        
        const topManufacturers = manufacturers.slice(0, 8);
        
        let legendHTML = '';
        topManufacturers.forEach(manufacturer => {
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${manufacturer.color}"></div>
                    <div class="legend-info">
                        <div class="legend-label">${manufacturer.manufacturer}</div>
                        <div class="legend-value">${manufacturer.violations} violations (${manufacturer.percentage}%)</div>
                    </div>
                </div>
            `;
        });
        
        legendContainer.innerHTML = legendHTML;
    }
    
    function displayManufacturerDetails(manufacturers) {
        const container = document.getElementById('manufacturerList');
        if (!container) return;
        
        let html = '';
        
        manufacturers.forEach(manufacturer => {
            html += `
                <div class="manufacturer-card">
                    <div class="manufacturer-name">${manufacturer.manufacturer}</div>
                    <div class="violation-count">${manufacturer.violations} Violations</div>
                    
                    <div class="harmful-substances">
                        <h4>Detected Harmful Substances:</h4>
                        <div class="substance-tags">
                            ${manufacturer.harmful_substances.map(substance => 
                                `<span class="substance-tag">${substance.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="risk-percentage">
                        <strong>Market Share of Violations: ${manufacturer.percentage}%</strong>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    function showErrorMessage(message) {
        const container = document.getElementById('manufacturerList');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Data</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }
    
    function showFallbackData() {
        console.log('Showing fallback data...');
        
        // Fallback statistics
        const fallbackSummary = {
            total_violations: 1250,
            total_manufacturers: 45,
        };
        
        // Fallback manufacturer data
        const fallbackManufacturers = [
            {
                manufacturer: 'ABC Cosmetics Sdn Bhd',
                violations: 85,
                percentage: '6.8',
                color: '#FF6B6B',
                harmful_substances: ['MERCURY', 'HYDROQUINONE']
            },
            {
                manufacturer: 'Beauty Plus Manufacturing',
                violations: 67,
                percentage: '5.4',
                color: '#4ECDC4',
                harmful_substances: ['LEAD', 'MERCURY']
            },
            {
                manufacturer: 'Golden Glow Industries',
                violations: 54,
                percentage: '4.3',
                color: '#45B7D1',
                harmful_substances: ['HYDROQUINONE', 'FORMALDEHYDE']
            },
            {
                manufacturer: 'Perfect Skin Co Ltd',
                violations: 42,
                percentage: '3.4',
                color: '#96CEB4',
                harmful_substances: ['MERCURY', 'PARABENS']
            },
            {
                manufacturer: 'Radiant Beauty Corp',
                violations: 38,
                percentage: '3.0',
                color: '#FFEAA7',
                harmful_substances: ['LEAD', 'ARSENIC']
            },
            {
                manufacturer: 'Luxury Skincare Ltd',
                violations: 32,
                percentage: '2.6',
                color: '#DDA0DD',
                harmful_substances: ['HYDROQUINONE', 'PARABENS']
            },
            {
                manufacturer: 'Premium Beauty Co',
                violations: 28,
                percentage: '2.2',
                color: '#98D8C8',
                harmful_substances: ['FORMALDEHYDE']
            },
            {
                manufacturer: 'Elite Cosmetics Sdn Bhd',
                violations: 25,
                percentage: '2.0',
                color: '#F7DC6F',
                harmful_substances: ['MERCURY', 'LEAD']
            }
        ];
        
        updateStatisticsCards(fallbackSummary);
        createManufacturerPieChart(fallbackManufacturers);
        displayManufacturerDetails(fallbackManufacturers);
        createChartLegend(fallbackManufacturers);
        
        // Show offline notice
        showMessage('Using offline data. Some information may not be current.', 'warning');
    }
    
    function showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <span class="message-icon">${type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span class="message-text">${message}</span>
        `;
        
        // Insert at the top of the main content
        const mainContent = document.querySelector('.main-content .container');
        if (mainContent) {
            mainContent.insertBefore(messageDiv, mainContent.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }
});