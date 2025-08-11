// Ingredients page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const ingredientSelect = document.getElementById('ingredientSelect');
    const ingredientDetails = document.getElementById('ingredientDetails');
    
    // Store all ingredients data
    let allIngredients = [];
    
    // Load banned/restricted ingredients information
    loadBannedIngredients();
    
    function loadBannedIngredients() {
        // Show loading state
        ingredientDetails.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading banned ingredients information...</p>
            </div>
        `;
        
        // Display banned/restricted ingredients data
        setTimeout(() => {
            allIngredients = [
                {
                    name: 'Mercury',
                    status: 'banned',
                    reason: 'Long-term exposure can cause serious neurological damage and kidney problems',
                    dateRestricted: '2020-01-01',
                    trend: 'rising',
                    sources: [
                        {
                            title: 'EPA Mercury Compounds Health Information',
                            url: 'https://www.epa.gov/mercury/health-effects-exposures-mercury',
                            organization: 'U.S. Environmental Protection Agency'
                        },
                        {
                            title: 'NIH Mercury Toxicity Information',
                            url: 'https://www.ncbi.nlm.nih.gov/books/NBK537049/',
                            organization: 'National Institutes of Health'
                        }
                    ]
                },
                {
                    name: 'Hydroquinone',
                    status: 'restricted',
                    reason: 'Prolonged use may cause skin cancer and permanent skin discoloration',
                    dateRestricted: '2021-06-15',
                    trend: 'stable',
                    sources: [
                        {
                            title: 'European Commission Regulation on Hydroquinone',
                            url: 'https://ec.europa.eu/growth/sectors/cosmetics/cosing_en',
                            organization: 'European Commission'
                        },
                        {
                            title: 'Safety Assessment of Hydroquinone',
                            url: 'https://www.cir-safety.org/ingredients',
                            organization: 'Cosmetic Ingredient Review'
                        }
                    ]
                },
                {
                    name: 'Lead Acetate',
                    status: 'banned',
                    reason: 'Highly toxic heavy metal that can cause developmental problems and organ damage',
                    dateRestricted: '2019-12-01',
                    trend: 'falling',
                    sources: [
                        {
                            title: 'EPA Lead in Cosmetics Guidelines',
                            url: 'https://www.epa.gov/lead/learn-about-lead',
                            organization: 'U.S. Environmental Protection Agency'
                        },
                        {
                            title: 'Health Canada Prohibition of Lead in Cosmetics',
                            url: 'https://www.canada.ca/en/health-canada/services/consumer-product-safety/cosmetics.html',
                            organization: 'Health Canada'
                        }
                    ]
                },
                {
                    name: 'Parabens (Certain Types)',
                    status: 'restricted',
                    reason: 'May disrupt hormone function and have potential links to reproductive issues',
                    dateRestricted: '2022-03-01',
                    trend: 'rising',
                    sources: [
                        {
                            title: 'FDA Parabens in Cosmetics Information',
                            url: 'https://www.fda.gov/cosmetics/cosmetic-ingredients/parabens-cosmetics',
                            organization: 'U.S. Food and Drug Administration'
                        },
                        {
                            title: 'American Cancer Society - Parabens',
                            url: 'https://www.cancer.org/cancer/cancer-causes/chemicals/parabens.html',
                            organization: 'American Cancer Society'
                        }
                    ]
                },
                {
                    name: 'Formaldehyde',
                    status: 'banned',
                    reason: 'Classified as a human carcinogen and can cause severe allergic reactions',
                    dateRestricted: '2021-01-15',
                    trend: 'stable',
                    sources: [
                        {
                            title: 'National Cancer Institute - Formaldehyde and Cancer Risk',
                            url: 'https://www.cancer.gov/about-cancer/causes-prevention/risk/substances/formaldehyde',
                            organization: 'National Cancer Institute'
                        },
                        {
                            title: 'CDC Facts About Formaldehyde',
                            url: 'https://www.cdc.gov/biomonitoring/Formaldehyde_FactSheet.html',
                            organization: 'Centers for Disease Control and Prevention'
                        }
                    ]
                },
                {
                    name: 'Coal Tar Dyes',
                    status: 'restricted',
                    reason: 'Contains carcinogenic compounds and may cause skin sensitization',
                    dateRestricted: '2020-09-01',
                    trend: 'rising',
                    sources: [
                        {
                            title: 'NTP Report on Coal Tar Pitch',
                            url: 'https://ntp.niehs.nih.gov/whatwestudy/assessments/cancer/roc/index.html',
                            organization: 'National Toxicology Program'
                        },
                        {
                            title: 'OSHA Coal Tar Products Safety Data',
                            url: 'https://www.osha.gov/chemicaldata/',
                            organization: 'Occupational Safety and Health Administration'
                        }
                    ]
                }
            ];
            
            // Initialize the interface
            populateIngredientSelector(allIngredients);
            showNoSelectionMessage();
        }, 1000);
    }
    
    function populateIngredientSelector(ingredients) {
        // Clear existing options except the first one
        ingredientSelect.innerHTML = '<option value="">Choose an ingredient...</option>';
        
        // Add ingredients to the selector
        ingredients.forEach((ingredient, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${ingredient.name} (${ingredient.status.toUpperCase()})`;
            ingredientSelect.appendChild(option);
        });
        
        // Add event listener for selection changes
        ingredientSelect.addEventListener('change', handleIngredientSelection);
    }
    
    function handleIngredientSelection(event) {
        const selectedIndex = event.target.value;
        
        if (selectedIndex === '') {
            showNoSelectionMessage();
        } else {
            displaySelectedIngredient(allIngredients[selectedIndex]);
        }
    }
    
    function showNoSelectionMessage() {
        ingredientDetails.innerHTML = `
            <div class="no-selection-message">
                <div class="message-icon">📋</div>
                <h3>Select an ingredient to get started</h3>
                <p>Choose an ingredient from the dropdown above to view detailed information about its risks, restrictions, and regulatory status.</p>
            </div>
        `;
    }
    
    function displaySelectedIngredient(ingredient) {
        const statusClass = ingredient.status === 'banned' ? 'status-banned' : 'status-restricted';
        const statusIcon = ingredient.status === 'banned' ? '🚫' : '⚠️';
        const trendIcon = ingredient.trend === 'rising' ? '📈' : 
                         ingredient.trend === 'falling' ? '📉' : '📊';
        const trendText = ingredient.trend === 'rising' ? 'Rising concern' : 
                         ingredient.trend === 'falling' ? 'Declining usage' : 'Stable monitoring';
        
        // Get background image based on ingredient name
        let backgroundImage = '';
        if (ingredient.name.toLowerCase().includes('mercury')) {
            backgroundImage = 'images/Mercury.jpg';
        } else if (ingredient.name.toLowerCase().includes('hydroquinone')) {
            backgroundImage = 'images/hydroquinone.jpg';
        } else if (ingredient.name.toLowerCase().includes('lead')) {
            backgroundImage = 'images/Lead_acetate.png';
        } else if (ingredient.name.toLowerCase().includes('parabens')) {
            backgroundImage = 'images/Parabens.png';
        } else if (ingredient.name.toLowerCase().includes('formaldehyde')) {
            backgroundImage = 'images/Formaldehyde.png';
        } else if (ingredient.name.toLowerCase().includes('coal tar')) {
            backgroundImage = 'images/Coal_Tar_Dyes.png';
        } else {
            backgroundImage = 'images/bg4.png';
        }
        
        const html = `
            <div class="selected-ingredient-display">
                <div class="banned-ingredient-card" style="background: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8)), url('${backgroundImage}') center/cover no-repeat;">
                    <div class="ingredient-header">
                        <div class="ingredient-title">
                            <h3>${ingredient.name}</h3>
                            <div class="ingredient-badges">
                                <span class="status-badge ${statusClass}">
                                    ${statusIcon} ${ingredient.status.toUpperCase()}
                                </span>
                                <span class="trend-badge trend-${ingredient.trend}">
                                    ${trendIcon} ${trendText}
                                </span>
                            </div>
                        </div>
                        <div class="restriction-date">
                            <span class="date-label">Restricted:</span>
                            <span class="date-value">${new Date(ingredient.dateRestricted).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</span>
                        </div>
                    </div>
                    
                    <div class="ingredient-content">
                        <div class="reason-section">
                            <h4>🔬 Why it's ${ingredient.status}:</h4>
                            <p class="reason-text">${ingredient.reason}</p>
                        </div>
                        
                        <div class="sources-section">
                            <h4>📚 Official Sources & References:</h4>
                            <div class="sources-list">
                                ${ingredient.sources.map(source => `
                                    <div class="source-item">
                                        <div class="source-info">
                                            <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">
                                                <span class="source-title">${source.title}</span>
                                                <span class="external-link-icon">🔗</span>
                                            </a>
                                            <span class="source-org">${source.organization}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="ingredients-footer">
                    <div class="disclaimer">
                        <h4>⚠️ Important Disclaimer</h4>
                        <p>This information is for educational purposes only. Regulations may vary by country and region. 
                        Always consult with regulatory authorities and healthcare professionals for the most current safety information.</p>
                    </div>
                    <div class="last-updated">
                        <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</p>
                    </div>
                </div>
            </div>
        `;
        
        ingredientDetails.innerHTML = html;
        
        // Smooth scroll to the details
        ingredientDetails.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
});
