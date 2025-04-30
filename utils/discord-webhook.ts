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

    try {
        // Format the message for Discord
        // Discord has a 2000 character limit per message, so we'll truncate if needed
        const truncateIfNeeded = (text: string, maxLength: number = 1000) => {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '... (truncated)';
        };

        const payload = {
            content: '', // Can be empty as we're using embeds
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

        // Send the data to Discord
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Failed to send message to Discord webhook', await response.text());
        }
    } catch (error) {
        console.error('Error sending to Discord webhook:', error);
    }
};