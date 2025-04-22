/**
 * Network Speed & IP Checker - IP Information Module
 * Fetches and displays the user's IP information using ipapi.co API
 */

// DOM Elements
const ipInfoElement = document.getElementById('ip-info');

// Fetch IP Information
async function fetchIPInfo() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        
        if (!response.ok) {
            throw new Error(`Error fetching IP data: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API Error: ${data.reason}`);
        }
        
        return data;
    } catch (error) {
        console.error('Failed to fetch IP info:', error);
        return null;
    }
}

// Display IP Information
function displayIPInfo(ipData) {
    if (!ipData) {
        ipInfoElement.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Unable to fetch IP information. Please try again later.
            </div>
        `;
        return;
    }
    
    // Create information HTML
    const infoHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 result-appear">
            <div>
                <p class="text-gray-500 text-sm">IP Address</p>
                <p class="font-medium text-lg">${ipData.ip}</p>
            </div>
            <div>
                <p class="text-gray-500 text-sm">Location</p>
                <p class="font-medium text-lg">${ipData.city}, ${ipData.region || ipData.country_name}</p>
            </div>
            <div>
                <p class="text-gray-500 text-sm">Country</p>
                <p class="font-medium text-lg">${ipData.country_name} (${ipData.country_code})</p>
            </div>
            <div>
                <p class="text-gray-500 text-sm">ISP / Organization</p>
                <p class="font-medium text-lg">${ipData.org || 'Unknown'}</p>
            </div>
            <div>
                <p class="text-gray-500 text-sm">Timezone</p>
                <p class="font-medium text-lg">${ipData.timezone}</p>
            </div>
            <div>
                <p class="text-gray-500 text-sm">Postal / ZIP</p>
                <p class="font-medium text-lg">${ipData.postal || 'Not available'}</p>
            </div>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-gray-500 text-sm">Coordinates</p>
                    <p class="font-medium">${ipData.latitude}, ${ipData.longitude}</p>
                </div>
                <a href="https://www.google.com/maps/search/?api=1&query=${ipData.latitude},${ipData.longitude}" 
                   target="_blank" 
                   class="text-primary hover:text-primary/80 font-medium flex items-center">
                    View on Map
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>
        </div>
    `;
    
    // Update the DOM
    ipInfoElement.innerHTML = infoHTML;
}

// Initialize IP Information on page load
document.addEventListener('DOMContentLoaded', async () => {
    const ipData = await fetchIPInfo();
    displayIPInfo(ipData);
}); 