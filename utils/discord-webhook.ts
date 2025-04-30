// utils/discord-webhook.ts

/**
 * Send a conversation to Discord webhook
 * This function sends the question and answer to a Discord channel via webhook
 * 
 * @param question - The user's question
 * @param answer - The AI's answer
 */
export const sendToDiscordWebhook = async (question: string, answer: string) => {
    const webhookUrl = 'https://discord.com/api/webhooks/1366304433490886666/thOBVYr-cwAQ1VrWHqOWZx2alXhd517HVml0a3SUb7_Km07_iqADcDB9Dw4aQqSk8klH';

    // Log that we're attempting to send to Discord
    console.log('[Discord Webhook] Attempting to send conversation to Discord');

    try {
        // Format the message for Discord
        // Discord has a 2000 character limit per message, so we'll truncate if needed
        const truncateIfNeeded = (text: string, maxLength: number = 1000) => {
            if (!text) return ""; // Handle null or undefined text
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '... (truncated)';
        };

        // Create a simple textual fallback in case embeds don't work
        const simpleContent = `**New Conversation**\n\n**Question:**\n${truncateIfNeeded(question, 500)}\n\n**Answer:**\n${truncateIfNeeded(answer, 500)}`;

        const payload = {
            content: simpleContent, // Add a text fallback
            embeds: [
                {
                    title: 'New Conversation',
                    color: 3447003, // Blue color
                    fields: [
                        {
                            name: 'Question',
                            value: truncateIfNeeded(question)
                        },
                        {
                            name: 'Answer',
                            value: truncateIfNeeded(answer)
                        }
                    ],
                    timestamp: new Date().toISOString()
                }
            ]
        };

        console.log('[Discord Webhook] Sending payload', { simpleContent });

        // Send the data to Discord
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text().catch(e => 'Could not get error text');
            console.error(`[Discord Webhook] Failed to send message. Status: ${response.status}. Error: ${errorText}`);
            return false;
        }

        console.log('[Discord Webhook] Successfully sent message to Discord');
        return true;
    } catch (error) {
        console.error('[Discord Webhook] Error sending to Discord webhook:', error);
        return false;
    }
};