import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    enableSound: {
        type: OptionType.BOOLEAN,
        description: "Play custom sound when temporary messages are deleted",
        default: true,
        restartNeeded: false
    },
    enableBanner: {
        type: OptionType.BOOLEAN, 
        description: "Show banner notification when messages are deleted",
        default: true,
        restartNeeded: false
    }
});

const tempMessages = new Map();

function showTimeModal(currentMessage, channelId, channelName) {
    // Create modal HTML
    const modalHTML = `
        <div id="temp-msg-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: var(--background-primary, #36393f);
                border-radius: 8px;
                padding: 24px;
                width: 450px;
                color: var(--text-normal, #dcddde);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            ">
                <h2 style="margin: 0 0 16px 0; color: var(--header-primary, #fff);">
                    ⏳ Send Temporary Message
                </h2>
                
                <div style="
                    background: var(--background-secondary, #2f3136);
                    padding: 12px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                    max-height: 100px;
                    overflow-y: auto;
                    border-left: 4px solid var(--brand-experiment, #5865f2);
                ">
                    <div style="font-size: 14px; word-wrap: break-word;">
                        "${currentMessage}"
                    </div>
                </div>

                <div style="margin-bottom: 16px; color: var(--text-muted, #72767d);">
                    Set deletion time (max: 24h 59m 59s):
                </div>

                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Hours</label>
                        <input type="number" id="hours-input" min="0" max="24" value="0" style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid var(--background-modifier-accent, #4f545c);
                            border-radius: 4px;
                            background: var(--input-background, #202225);
                            color: var(--text-normal, #dcddde);
                            text-align: center;
                            font-size: 16px;
                        ">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Minutes</label>
                        <input type="number" id="minutes-input" min="0" max="59" value="0" style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid var(--background-modifier-accent, #4f545c);
                            border-radius: 4px;
                            background: var(--input-background, #202225);
                            color: var(--text-normal, #dcddde);
                            text-align: center;
                            font-size: 16px;
                        ">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Seconds</label>
                        <input type="number" id="seconds-input" min="0" max="59" value="10" style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid var(--background-modifier-accent, #4f545c);
                            border-radius: 4px;
                            background: var(--input-background, #202225);
                            color: var(--text-normal, #dcddde);
                            text-align: center;
                            font-size: 16px;
                        ">
                    </div>
                </div>

                <div id="time-preview" style="
                    background: var(--background-modifier-accent, #4f545c);
                    padding: 12px;
                    border-radius: 4px;
                    text-align: center;
                    margin-bottom: 20px;
                    font-weight: 600;
                ">
                    Message will delete in: <span id="preview-text">10s</span>
                </div>

                <div id="error-message" style="
                    color: var(--text-danger, #f04747);
                    background: rgba(240, 71, 71, 0.1);
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 16px;
                    text-align: center;
                    display: none;
                "></div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancel-btn" style="
                        padding: 10px 20px;
                        border: 2px solid var(--interactive-normal, #b9bbbe);
                        border-radius: 4px;
                        background: transparent;
                        color: var(--interactive-normal, #b9bbbe);
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    ">Cancel</button>
                    <button id="send-btn" style="
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        background: var(--brand-experiment, #5865f2);
                        color: white;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    ">🚀 Send Temporary Message</button>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('temp-msg-modal');
    const hoursInput = document.getElementById('hours-input');
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const previewText = document.getElementById('preview-text');
    const errorMessage = document.getElementById('error-message');
    const cancelBtn = document.getElementById('cancel-btn');
    const sendBtn = document.getElementById('send-btn');

    function updatePreview() {
        const h = parseInt(hoursInput.value) || 0;
        const m = parseInt(minutesInput.value) || 0;
        const s = parseInt(secondsInput.value) || 0;
        
        const parts = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        if (s > 0) parts.push(`${s}s`);
        
        previewText.textContent = parts.join(' ') || '0s';
    }

    // Update preview on input change
    [hoursInput, minutesInput, secondsInput].forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    // Close modal
    function closeModal() {
        modal.remove();
    }

    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Send message
    sendBtn.addEventListener('click', () => {
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;

        if (hours === 0 && minutes === 0 && seconds === 0) {
            errorMessage.textContent = 'Please set at least 1 second';
            errorMessage.style.display = 'block';
            return;
        }

        if (hours > 24 || (hours === 24 && (minutes > 0 || seconds > 0))) {
            errorMessage.textContent = 'Maximum time is 24 hours';
            errorMessage.style.display = 'block';
            return;
        }

        // Send the message and schedule deletion
        sendTemporaryMessage(currentMessage, channelId, channelName, hours, minutes, seconds);
        closeModal();
    });
}

function sendTemporaryMessage(message, channelId, channelName, hours, minutes, seconds) {
    // Send message by simulating Enter key
    const textArea = document.querySelector('[data-slate-editor="true"], [contenteditable="true"]');
    if (textArea) {
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        });
        textArea.dispatchEvent(enterEvent);

        // Schedule deletion
        setTimeout(() => {
            const messages = document.querySelectorAll('[class*="message"]');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const messageId = lastMessage.id || `msg-${Date.now()}`;
                
                scheduleMessageDeletion(messageId, channelId, channelName, hours, minutes, seconds);
            }
        }, 500);
    }
}

function scheduleMessageDeletion(messageId, channelId, channelName, hours, minutes, seconds) {
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    
    const timeoutId = setTimeout(() => {
        deleteMessage(messageId, channelName);
        tempMessages.delete(messageId);
    }, totalMs);

    tempMessages.set(messageId, {
        messageId,
        channelId,
        channelName,
        timeoutId
    });

    console.log(`⏰ Scheduled deletion for message ${messageId} in ${hours}h ${minutes}m ${seconds}s`);
}

async function deleteMessage(messageId, channelName) {
    try {
        // Find the message element and try to delete it
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            // Try to click the delete button
            const moreButton = messageElement.querySelector('[aria-label*="More"]');
            if (moreButton) {
                moreButton.click();
                
                setTimeout(() => {
                    const deleteOption = document.querySelector('[id*="message-delete"]');
                    if (deleteOption) {
                        deleteOption.click();
                        
                        setTimeout(() => {
                            const confirmButton = document.querySelector('[class*="danger"]:not([disabled])');
                            if (confirmButton) {
                                confirmButton.click();
                                
                                // Show notifications after successful deletion
                                setTimeout(() => {
                                    playDeletionSound();
                                    showTopBanner(channelName);
                                }, 100);
                            }
                        }, 100);
                    }
                }, 100);
            }
        }
        
        console.log(`✅ Attempted to delete temporary message: ${messageId}`);
    } catch (error) {
        console.error("❌ Failed to delete message:", error);
    }
}

function playDeletionSound() {
    if (!settings.store.enableSound) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
        console.log("Could not play deletion sound:", error);
    }
}

function showTopBanner(channelName) {
    if (!settings.store.enableBanner) return;

    const banner = document.createElement("div");
    banner.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #f04747, #ff6b6b);
            color: white;
            padding: 14px 20px;
            text-align: center;
            font-weight: 600;
            font-size: 15px;
            z-index: 10000;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            animation: slideDown 0.4s ease-out, fadeOut 0.6s ease-in 3.5s forwards;
        ">
            🗑️ Your temporary message got deleted from ${channelName}
        </div>
    `;

    if (!document.getElementById("temp-msg-banner-styles")) {
        const style = document.createElement("style");
        style.id = "temp-msg-banner-styles";
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-100%); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.remove();
    }, 4200);
}

function createTempMessageButton() {
    // Add button styles
    if (!document.getElementById("temp-msg-button-styles")) {
        const style = document.createElement("style");
        style.id = "temp-msg-button-styles";
        style.textContent = `
            .temp-msg-button {
                background: transparent;
                border: none;
                padding: 6px 8px;
                margin: 0 4px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 18px;
                color: var(--interactive-normal, #b9bbbe);
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                height: 32px;
            }
            .temp-msg-button:hover {
                background: var(--background-modifier-hover, rgba(79, 84, 92, 0.16));
                color: var(--interactive-hover, #dcddde);
                transform: scale(1.1);
            }
            .temp-msg-button:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    // Watch for chat inputs and add buttons
    const observer = new MutationObserver(() => {
        const chatInputs = document.querySelectorAll('[class*="chatContent"] form:not([data-temp-button])');
        
        chatInputs.forEach(form => {
            form.setAttribute('data-temp-button', 'true');
            
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'temp-msg-button';
            button.innerHTML = '⏳';
            button.title = 'Send temporary message with custom timer';
            
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const textArea = form.querySelector('[data-slate-editor="true"], [contenteditable="true"]');
                if (!textArea) {
                    alert('Could not find text input');
                    return;
                }
                
                const message = textArea.textContent || textArea.innerText || '';
                if (!message.trim()) {
                    alert('Please enter a message first');
                    textArea.focus();
                    return;
                }

                // Get current channel info
                const pathParts = window.location.pathname.split('/');
                const channelId = pathParts[pathParts.length - 1];
                const channelElement = document.querySelector('[class*="title"][class*="base"], [class*="channel"] h1, [data-list-item-id*="channels"] [class*="name"]');
                const channelName = channelElement?.textContent?.trim() || 'Unknown Channel';
                
                showTimeModal(message, channelId, channelName);
            };
            
            const buttonsContainer = form.querySelector('[class*="buttons"], [class*="attachButton"]')?.parentElement || form;
            buttonsContainer.appendChild(button);
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
}

export default definePlugin({
    name: "TemporaryMessages",
    description: "Send messages with custom deletion times using a beautiful time picker modal",
    authors: [{ name: "User", id: 0n }],
    settings,

    observer: null,

    start() {
        console.log("✅ TemporaryMessages plugin started!");
        this.observer = createTempMessageButton();
    },

    stop() {
        console.log("🛑 TemporaryMessages plugin stopped");
        
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Clear all scheduled deletions
        tempMessages.forEach(({ timeoutId }) => clearTimeout(timeoutId));
        tempMessages.clear();
        
        // Remove styles and buttons
        document.getElementById("temp-msg-button-styles")?.remove();
        document.getElementById("temp-msg-banner-styles")?.remove();
        document.querySelectorAll(".temp-msg-button").forEach(btn => btn.remove());
        document.getElementById("temp-msg-modal")?.remove();
    }
});
