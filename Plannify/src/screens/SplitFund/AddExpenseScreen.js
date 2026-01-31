import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AppContext } from '../../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SplitService } from '../../services/SplitService';
import { splitEqually, splitByPercentage, splitByShares, splitByAdjustment, splitExact } from '../../utils/SplitLogic';

const SPLIT_TYPES = ['Equally', 'Percent', 'Shares', 'Adjust', 'Exact'];

const AddExpenseScreen = ({ route }) => {
    const { colors, theme, user } = useContext(AppContext);
    const { groupId, members } = route.params;
    const navigation = useNavigation();
    
    const currentUser = { id: user?.id || 'local_user' };

    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [payer, setPayer] = useState(currentUser.id);
    const [splitType, setSplitType] = useState('Equally');
    
    const [isLoading, setIsLoading] = useState(false);
    
    // Split Input States
    const [splitInputs, setSplitInputs] = useState({}); // Stores % or shares or exact amounts per user

    const handleSave = async () => {
        if (!desc || !amount) {
            Alert.alert("Missing Fields", "Please enter description and amount.");
            return;
        }

        if (!user?.idToken) {
            Alert.alert("Error", "You must be logged in to add expenses.");
            return;
        }

        const totalAmt = parseFloat(amount);
        let finalSplits = {};
        
        try {
            setIsLoading(true);
            switch (splitType) {
                case 'Equally':
                    finalSplits = splitEqually(totalAmt, members);
                    break;
                case 'Percent':
                    // Validate total % is 100? Or just warn?
                    finalSplits = splitByPercentage(totalAmt, members, splitInputs);
                    break;
                case 'Shares':
                    finalSplits = splitByShares(totalAmt, members, splitInputs);
                    break;
                case 'Adjust':
                    finalSplits = splitByAdjustment(totalAmt, members, splitInputs);
                    break;
                case 'Exact':
                    const sum = Object.values(splitInputs).reduce((a,b) => a + Number(b), 0);
                    if (Math.abs(sum - totalAmt) > 0.05) {
                        Alert.alert("Error", `Total must equal ${totalAmt}. Current: ${sum}`);
                        setIsLoading(false);
                        return;
                    }
                    finalSplits = splitInputs;
                    break;
            }

            await SplitService.addExpense(user.idToken, {
                groupId,
                description: desc,
                amount: totalAmt,
                paidBy: payer,
                splitType,
                splits: finalSplits,
                date: new Date()
            });
            
            Alert.alert("Success", "Expense added!", [{ text: "OK", onPress: () => navigation.goBack() }]);

        } catch (e) {
            Alert.alert("Error", "Could not save expense. Please try again.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.textPrimary },
        subText: { color: colors.textSecondary },
        input: { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
        card: { backgroundColor: colors.surface, borderColor: colors.border },
    };

    const renderSplitInputs = () => {
        if (splitType === 'Equally') return (
            <Text style={[styles.infoText, dynamicStyles.subText]}>
                Split equally between {members.length} people ({colors.currency}{amount ? (amount/members.length).toFixed(2) : 0}/person)
            </Text>
        );

        return members.map(m => (
            <View key={m.id} style={styles.memberRow}>
                <View style={styles.avatar}>
                     <Text style={{color:'white', fontWeight:'bold'}}>{m.name[0]}</Text>
                </View>
                <Text style={[styles.memberName, dynamicStyles.text]}>{m.name}</Text>
                
                <TextInput
                    style={[styles.smallInput, dynamicStyles.input]}
                    placeholder={splitType === 'Percent' ? '%' : splitType === 'Shares' ? '1' : '0'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={splitInputs[m.id] ? String(splitInputs[m.id]) : ''}
                    onChangeText={(val) => setSplitInputs(prev => ({ ...prev, [m.id]: val }))}
                />
            </View>
        ));
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={{ padding: 20 }}>
            {/* MAIN INPUTS */}
            <View style={[styles.card, dynamicStyles.card, { padding: 15, borderRadius: 12, marginBottom: 20 }]}>
                <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="format-text" size={24} color={colors.textSecondary} />
                    <TextInput 
                        placeholder="Description"
                        placeholderTextColor={colors.textMuted}
                        style={[styles.mainInput, { color: colors.textPrimary }]}
                        value={desc}
                        onChangeText={setDesc}
                    />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="currency-usd" size={24} color={colors.textSecondary} />
                    <TextInput 
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={[styles.mainInput, { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' }]}
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>
            </View>

            {/* PAYER SELECTION */}
            <Text style={[styles.label, dynamicStyles.subText]}>Paid by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {members.map(m => (
                    <TouchableOpacity 
                        key={m.id}
                        style={[styles.chip, payer === m.id ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => setPayer(m.id)}
                    >
                        <Text style={{ color: payer === m.id ? 'white' : colors.textPrimary }}>{m.id === currentUser.id ? 'You' : m.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* SPLIT TYPE TABS */}
            <Text style={[styles.label, dynamicStyles.subText]}>Split Method</Text>
            <View style={styles.tabRow}>
                {SPLIT_TYPES.map(type => (
                    <TouchableOpacity 
                        key={type}
                        style={[styles.tab, splitType === type && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                        onPress={() => setSplitType(type)}
                    >
                        <Text style={{ color: splitType === type ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>{type}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* SPLIT DETAILS */}
            <View style={[styles.card, dynamicStyles.card, { padding: 15, borderRadius: 12 }]}>
                {renderSplitInputs()}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Expense</Text>
            </TouchableOpacity>

        </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    card: { borderWidth: 1 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mainInput: { flex: 1, height: 40, fontSize: 16 },
    divider: { height: 1, marginVertical: 10 },
    label: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, uppercase: true },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
    tabRow: { flexDirection: 'row', marginBottom: 20, justifyContent: 'space-between' },
    tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
    
    memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#888', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    memberName: { flex: 1 },
    smallInput: { width: 80, height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, textAlign: 'right' },
    
    infoText: { textAlign: 'center', marginVertical: 10 },
    saveBtn: { marginTop: 30, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default AddExpenseScreen;
