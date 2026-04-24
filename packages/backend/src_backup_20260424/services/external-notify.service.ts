/**
 * External Notification Service
 *
 * Sends notifications to external platforms (Slack, Kakao Work)
 * via incoming webhooks.
 */
export class ExternalNotifyService {
  /**
   * Send a message to a Slack channel via Incoming Webhook.
   *
   * @param webhookUrl - Slack Incoming Webhook URL
   * @param message    - Plain-text message to send
   * @returns true if the webhook responded with 2xx, false otherwise
   */
  static async sendSlack(webhookUrl: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
      return response.ok;
    } catch (error) {
      console.error('Slack notification failed:', error);
      return false;
    }
  }

  /**
   * Send a message to a Kakao Work channel via Incoming Webhook.
   *
   * @param webhookUrl - Kakao Work Incoming Webhook URL
   * @param message    - Plain-text message to send
   * @returns true if the webhook responded with 2xx, false otherwise
   */
  static async sendKakao(webhookUrl: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Kakao notification failed:', error);
      return false;
    }
  }
}
