import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, FlatList } from 'react-native';
import { AppContext } from '../../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SplitService } from '../../services/SplitService';
import { simplifyDebts } from '../../utils/SplitLogic';

const SettleUpScreen = ({ route }) => {
    const { colors, theme, user } = useContext(AppContext);
    const { groupId, balances, members } = route.params;
    const navigation = useNavigation();
    const currentUser = { id: user?.id || 'local_user' };

    const [payer, setPayer] = useState(currentUser.id);
    const [payee, setPayee] = useState(''); // Default empty
    const [amount, setAmount] = useState('');
    
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (balances) {
            const simplified = simplifyDebts(balances);
            setSuggestions(simplified);
            
            // Auto-select a suggestion involving current user if exists
            const mySuggestion = simplified.find(s => s.from === currentUser.id || s.to === currentUser.id);
            if (mySuggestion) {
                if (mySuggestion.from === currentUser.id) {
                    setPayer(currentUser.id);
                    setPayee(mySuggestion.to);
                    setAmount(String(mySuggestion.amount));
                } else {
                    setPayer(mySuggestion.from);
                    setPayee(currentUser.id);
                    setAmount(String(mySuggestion.amount));
                }
            } else if (simplified.length > 0) {
                 setPayer(simplified[0].from);
                 setPayee(simplified[0].to);
                 setAmount(String(simplified[0].amount));
            }
        }
    }, [balances]);

    const handleRecordPayment = async () => {
        if (!payee || !amount) {
            Alert.alert("Error", "Please select who is getting paid and the amount.");
            return;
        }

        if (!user?.idToken) {
            Alert.alert("Error", "You must be logged in to record payments.");
            return;
        }

        try {
            // A Payment is just an expense where Payer pays explicitly for Payee
            await SplitService.addExpense(user.idToken, {
                groupId,
                description: 'Payment',
                amount: parseFloat(amount),
                paidBy: payer,
                splitType: 'Payment',
                splits: { [payee]: parseFloat(amount) }, 
                type: 'payment', // Mark as payment type
                date: new Date()
            });
            
            Alert.alert("Success", "Payment recorded!", [{ text: "OK", onPress: () => navigation.goBack() }]);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not record payment.");
        }
    };
    
    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.textPrimary },
        subText: { color: colors.textSecondary },
        card: { backgroundColor: colors.surface, borderColor: colors.border },
    };

    const getName = (id) => {
        if (id === currentUser.id) return 'You';
        return members.find(m => m.id === id)?.name || 'Unknown';
    };

    return (
        <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={{ padding: 20 }}>
            
            {/* SUGGESTIONS */}
            {suggestions.length > 0 && (
                <View style={{ marginBottom: 25 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Suggested Payments</Text>
                    {suggestions.map((s, index) => (
                         <TouchableOpacity 
                            key={index} 
                            style={[styles.suggestionCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                            onPress={() => {
                                setPayer(s.from);
                                setPayee(s.to);
                                setAmount(String(s.amount));
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="arrow-right-thin" size={24} color={colors.primary} />
                                <Text style={[styles.sugText, dynamicStyles.text]}>
                                    <Text style={{ fontWeight: 'bold' }}>{getName(s.from)}</Text> pays <Text style={{ fontWeight: 'bold' }}>{getName(s.to)}</Text>
                                </Text>
                            </View>
                            <Text style={[styles.sugAmount, { color: colors.primary }]}>{colors.currency}{s.amount}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* MANUAL FORM */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Record Payment</Text>
            
            <View style={[styles.card, dynamicStyles.card]}>
                {/* PAYER ROW */}
                <View style={styles.row}>
                    <Text style={[styles.rowLabel, dynamicStyles.subText]}>From</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {members.map(m => (
                            <TouchableOpacity 
                                key={m.id}
                                style={[styles.chip, payer === m.id ? { backgroundColor: colors.primary } : { borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => setPayer(m.id)}
                            >
                                <Text style={{ color: payer === m.id ? 'white' : colors.textPrimary }}>{m.id === currentUser.id ? 'You' : m.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ARROW */}
                <View style={{ alignItems: 'center', marginVertical: -10, zIndex: 1 }}>
                     <View style={{ backgroundColor: colors.background, padding: 5, borderRadius: 20 }}>
                         <MaterialCommunityIcons name="arrow-down" size={24} color={colors.textMuted} />
                     </View>
                </View>

                {/* PAYEE ROW */}
                <View style={styles.row}>
                    <Text style={[styles.rowLabel, dynamicStyles.subText]}>To</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {members.map(m => (
                            <TouchableOpacity 
                                key={m.id}
                                style={[styles.chip, payee === m.id ? { backgroundColor: colors.success } : { borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => setPayee(m.id)}
                            >
                                <Text style={{ color: payee === m.id ? 'white' : colors.textPrimary }}>{m.id === currentUser.id ? 'You' : m.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                
                {/* AMOUNT */}
                <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={[dynamicStyles.subText, { fontSize: 12, marginBottom: 5 }]}>AMOUNT</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.textPrimary }}>{colors.currency || '$'}</Text>
                         <TextInput
                            style={{ fontSize: 40, fontWeight: 'bold', color: colors.textPrimary, minWidth: 100, textAlign: 'center' }}
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>
                </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.success }]} onPress={handleRecordPayment}>
                <Text style={styles.saveBtnText}>Record Cash Payment</Text>
            </TouchableOpacity>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    card: { borderRadius: 16, borderWidth: 1, marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, uppercase: true, marginLeft: 5 },
    
    suggestionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
    sugText: { marginLeft: 10, fontSize: 14 },
    sugAmount: { fontWeight: 'bold', fontSize: 16 },

    row: { padding: 15 },
    rowLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
    divider: { height: 1, width: '100%' },

    saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default SettleUpScreen;
