import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationsContext';
import { companyRegistrationReviewStyles as styles } from '@/styles/company-registration-review.styles';
import {
  type CompanyRegistrationPaymentMethod,
  getCompanyRegistrationDraft,
  loadCompanyRegistrationState,
  saveCompanyRegistrationState,
} from '@/utils/company-registration-draft';

export default function CompanyRegistrationReviewPaywallScreen() {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [draft, setDraft] = useState(getCompanyRegistrationDraft());
  const [paying, setPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CompanyRegistrationPaymentMethod>(null);

  const totalCost = 4999 + 2000 + 499;

  const refreshState = useCallback(async () => {
    const state = await loadCompanyRegistrationState();
    if (state.draft) setDraft(state.draft);
    setIsPaid(state.paymentStatus === 'paid');
    setPaymentMethod(state.paymentMethod);
    if (state.status === 'submitted') {
      await saveCompanyRegistrationState({ status: 'payment_pending' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshState();
    }, [refreshState]),
  );

  const handlePayAndInitiate = async () => {
    if (paying) return;
    if (isPaid) {
      router.push('/company-registration-upload-tracking');
      return;
    }
    if (!paymentMethod) return;
    setPaying(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await saveCompanyRegistrationState({
      draft: null,
      status: 'paid',
      paymentStatus: 'paid',
      paymentMethod,
      paidAt: new Date().toISOString(),
    });
    addNotification({
      title: 'Payment Successful',
      body: 'Payment received. Upload and filing process is now unlocked.',
    });
    setIsPaid(true);
    setPaying(false);
    router.push('/company-registration-upload-tracking');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{draft ? 'Summary of Entered Details' : 'Submission Received'}</Text>
        {draft ? (
          <>
            {draft.caseId ? (
              <View style={styles.row}>
                <Text style={styles.label}>Case ID</Text>
                <Text style={styles.value}>{draft.caseId}</Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.label}>Business Type</Text>
              <Text style={styles.value}>{draft.businessType || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Proposed Names</Text>
              <Text style={styles.value}>
                {[draft.proposedName1, draft.proposedName2, draft.proposedName3].filter(Boolean).join(', ') || '-'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Company Mobile</Text>
              <Text style={styles.value}>{draft.companyMobile || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Company Email</Text>
              <Text style={styles.value}>{draft.companyEmail || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Business Activity</Text>
              <Text style={styles.value}>{draft.businessActivity || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Registered Address</Text>
              <Text style={styles.value}>{draft.registeredAddress || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Capital Structure</Text>
              <Text style={styles.value}>{draft.capitalStructure || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Directors Count</Text>
              <Text style={styles.value}>{draft.directors?.length ?? 0}</Text>
            </View>
            {(draft.directors || []).map((d, i) => (
              <View key={`dir-${i}`}>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.label}>Director {i + 1}</Text>
                  <Text style={styles.value}>{d.name || '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>PAN</Text>
                  <Text style={styles.value}>{d.pan || '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Aadhaar</Text>
                  <Text style={styles.value}>{d.aadhaar || '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Shareholding %</Text>
                  <Text style={styles.value}>{d.shareholding || '-'}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.value}>Your submission has been received. Complete payment below to continue with document upload and filing.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Total Cost Breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Professional Fees</Text>
          <Text style={styles.value}>INR 4,999</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Government Fees</Text>
          <Text style={styles.value}>INR 2,000</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Convenience Charges</Text>
          <Text style={styles.value}>INR 499</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.value}>INR {totalCost.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estimated Timeline</Text>
        <Text style={styles.value}>7-15 working days (subject to document verification)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Refund Policy</Text>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.bulletText}>Refund is not applicable after filing is initiated.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.bulletText}>If filing is not initiated, partial refund may apply per policy.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Payment Method</Text>
        <View style={styles.paymentMethodsWrap}>
          <Pressable
            style={[styles.paymentMethodChip, paymentMethod === 'upi' && styles.paymentMethodChipActive]}
            onPress={() => setPaymentMethod('upi')}>
            <Ionicons
              name="phone-portrait-outline"
              size={16}
              color={paymentMethod === 'upi' ? Colors.textOnPrimary : Colors.textPrimary}
            />
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === 'upi' && styles.paymentMethodTextActive,
              ]}>
              UPI
            </Text>
          </Pressable>
          <Pressable
            style={[styles.paymentMethodChip, paymentMethod === 'qr' && styles.paymentMethodChipActive]}
            onPress={() => setPaymentMethod('qr')}>
            <Ionicons
              name="qr-code-outline"
              size={16}
              color={paymentMethod === 'qr' ? Colors.textOnPrimary : Colors.textPrimary}
            />
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === 'qr' && styles.paymentMethodTextActive,
              ]}>
              QR
            </Text>
          </Pressable>
          <Pressable
            style={[styles.paymentMethodChip, paymentMethod === 'card' && styles.paymentMethodChipActive]}
            onPress={() => setPaymentMethod('card')}>
            <Ionicons
              name="card-outline"
              size={16}
              color={paymentMethod === 'card' ? Colors.textOnPrimary : Colors.textPrimary}
            />
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === 'card' && styles.paymentMethodTextActive,
              ]}>
              Card
            </Text>
          </Pressable>
        </View>
        {paymentMethod === 'upi' ? (
          <Text style={styles.paymentHint}>Pay using any UPI app (GPay, PhonePe, Paytm).</Text>
        ) : null}
        {paymentMethod === 'card' ? (
          <Text style={styles.paymentHint}>Card payment gateway will open after tapping pay.</Text>
        ) : null}
        {paymentMethod === 'qr' ? (
          <View style={styles.qrCard}>
            <Ionicons name="qr-code" size={64} color={Colors.primary} />
            <Text style={styles.paymentHint}>Scan this UPI QR to complete payment.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.lockTitle}>Locked Until Payment</Text>
        <View style={styles.bulletRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#b45309" />
          <Text style={styles.bulletText}>Filing process</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#b45309" />
          <Text style={styles.bulletText}>Document upload</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#b45309" />
          <Text style={styles.bulletText}>Case ID generation</Text>
        </View>
      </View>

      <Pressable
        style={[styles.payButton, paying && styles.payButtonDisabled]}
        onPress={handlePayAndInitiate}
        disabled={paying || (!paymentMethod && !isPaid)}>
        {paying ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={styles.payButtonText}>
            {isPaid ? 'Payment Completed - Continue' : 'Pay & Initiate Filing'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

