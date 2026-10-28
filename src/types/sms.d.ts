declare module 'react-native-get-sms-android' {
  export type SmsFilter = {
    box?: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued' | '';
    minDate?: number;
    maxDate?: number;
    bodyRegex?: string;
    read?: 0 | 1;
    _id?: number;
    thread_id?: number;
    address?: string;
    body?: string;
    indexFrom?: number;
    maxCount?: number;
  };

  const SmsAndroid: {
    list: (
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ) => void;
    autoSend: (
      phoneNumber: string,
      message: string,
      fail: (error: string) => void,
      success: (sent: string) => void
    ) => void;
    delete: (id: number, fail: (error: string) => void, success: (count: number) => void) => void;
  };

  export default SmsAndroid;
}
