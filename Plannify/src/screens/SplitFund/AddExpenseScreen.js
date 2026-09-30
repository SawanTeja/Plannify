import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';

import { AppContext } from '../../context/AppContext';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { SplitService } from '../../services/SplitService';
import { splitEqually, splitByPercentage, splitByShares, splitByAdjustment } from '../../utils/SplitLogic';
import getStyles from './AddExpenseScreen.styles';

const SPLIT_TYPES = ['Equally', 'Percent', 'Shares', 'Adjust', 'Exact'];

const AddExpenseScreen = ({ route }) => {
    const { colors, user } = useContext(AppContext);
    const { showAlert } = useAlert();
    const { groupId, members } = route.params;
    const navigation = useNavigation();
    const styles = useThemedStyles(getStyles);
    
    // Get user ID consistently - backend returns _id, some places use id
    const currentUserId = user?.user?.id || user?.user?._id || 'local_user';

    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [payer, setPayer] = useState(currentUserId);
    const [splitType, setSplitType] = useState('Equally');
    const [currency, setCurrency] = useState('$'); // Default
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    
    // Split Input States
    const [splitInputs, setSplitInputs] = useState({}); // Stores % or shares or exact amounts per user

    const CURRENCIES = ['$', '₹', '€', '£', '¥', 'A$', 'C$'];

    const handleSave = async () => {
        if (!amount) {
            showAlert("Missing Amount", "Please enter an amount.");
            return;
        }

        if (!user?.idToken) {
            showAlert("Error", "You must be logged in to add expenses.");
            return;
        }

        const totalAmt = parseFloat(amount);
        let finalSplits = {};
        
        try {
            setIsLoading(true);
            switch (splitType) {
                case 'Equally':
                    finalSplits = splitEqually(totalAmt, members.map(m => ({ id: m._id || m.id, name: m.name })));
                    break;
                case 'Percent':
                    // Validate total % is 100? Or just warn?
                    finalSplits = splitByPercentage(totalAmt, members.map(m => ({ id: m._id || m.id, name: m.name })), splitInputs);
                    break;
                case 'Shares':
                    finalSplits = splitByShares(totalAmt, members.map(m => ({ id: m._id || m.id, name: m.name })), splitInputs);
                    break;
                case 'Adjust':
                    finalSplits = splitByAdjustment(totalAmt, members.map(m => ({ id: m._id || m.id, name: m.name })), splitInputs);
                    break;
                case 'Exact':
                    const sum = Object.values(splitInputs).reduce((a,b) => a + Number(b), 0);
                    if (Math.abs(sum - totalAmt) > 0.05) {
                        showAlert("Error", `Total must equal ${totalAmt}. Current: ${sum}`);
                        setIsLoading(false);
                        return;
                    }
                    finalSplits = splitInputs;
                    break;
            }

            // Use "Expense" as default description if empty
            const finalDesc = desc.trim() || "Expense";

            await SplitService.addExpense(user.idToken, {
                groupId,
                description: finalDesc,
                amount: totalAmt,
                currency: currency, // Save selected currency
                paidBy: payer,
                splitType,
                splits: finalSplits,
                date: new Date()
            });
            
            showAlert("Success", "Expense added!", [{ text: "OK", onPress: () => navigation.goBack() }]);

        } catch (e) {
            showAlert("Error", "Could not save expense. Please try again.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const renderSplitInputs = () => {
        if (splitType === 'Equally') {
            const perPerson = amount ? (parseFloat(amount)/members.length).toFixed(2) : 0;
            return (
                <Text style={styles.infoText}>
                    Split equally between {members.length} people ({colors.currency}{perPerson}/person)
                </Text>
            );
        }

        return members.map(m => {
            const memberId = m._id || m.id;
            return (
            <View key={memberId} style={styles.memberRow}>
                <View style={styles.avatar}>
                     <Text style={styles.avatarText}>{m.name?.[0] || '?'}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                
                <TextInput
                    style={styles.smallInput}
                    placeholder={splitType === 'Percent' ? '%' : splitType === 'Shares' ? '1' : '0'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={splitInputs[memberId] ? String(splitInputs[memberId]) : ''}
                    onChangeText={(val) => setSplitInputs(prev => ({ ...prev, [memberId]: val }))}
                />
            </View>
        )});
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* MAIN INPUTS */}
            <View style={styles.mainCard}>
                <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="format-text" size={24} color={colors.textSecondary} />
                    <TextInput 
                        placeholder="Description (Optional)"
                        placeholderTextColor={colors.textMuted}
                        style={styles.mainInput}
                        value={desc}
                        onChangeText={setDesc}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.inputRowZIndex}>
                    <View style={styles.currencyPickerWrap}>
                        <TouchableOpacity 
                            onPress={() => setCurrencyModalVisible(!currencyModalVisible)}
                            style={styles.currencyBtn}
                        >
                            <Text style={styles.currencyBtnText}>{currency}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Floating Dropdown */}
                        {currencyModalVisible && (
                            <View style={styles.currencyDropdown}>
                                {CURRENCIES.map((curr, index) => (
                                    <TouchableOpacity 
                                        key={curr} 
                                        onPress={() => { setCurrency(curr); setCurrencyModalVisible(false); }} 
                                        style={[
                                            styles.currencyOption,
                                            index !== CURRENCIES.length - 1 && styles.currencyOptionBorder
                                        ]}
                                    >
                                        <Text style={styles.currencyOptionText}>{curr}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <TextInput 
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={styles.amountInput} 
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>
            </View>

            {/* PAYER SELECTION */}
            <Text style={styles.label}>Paid by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
                {members.map(m => {
                    const memberId = m._id || m.id;
                    const isPayer = payer === memberId;
                    return (
                    <TouchableOpacity 
                        key={memberId}
                        style={[styles.chip, isPayer ? styles.chipActive : styles.chipInactive]}
                        onPress={() => setPayer(memberId)}
                    >
                        <Text style={[styles.chipText, isPayer ? styles.chipTextActive : styles.chipTextInactive]}>
                            {memberId === currentUserId ? 'You' : m.name}
                        </Text>
                    </TouchableOpacity>
                )})}
            </ScrollView>

            {/* SPLIT TYPE TABS */}
            <Text style={styles.label}>Split Method</Text>
            <View style={styles.tabRow}>
                {SPLIT_TYPES.map(type => (
                    <TouchableOpacity 
                        key={type}
                        style={[styles.tab, splitType === type && styles.tabActive]}
                        onPress={() => setSplitType(type)}
                    >
                        <Text style={[styles.tabText, splitType === type && styles.tabTextActive]}>{type}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* SPLIT DETAILS */}
            <View style={styles.card}>
                {renderSplitInputs()}
            </View>

            <TouchableOpacity 
                style={[styles.saveBtn, { opacity: isLoading ? 0.7 : 1 }]} 
                onPress={handleSave}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.saveBtnText}>Save Expense</Text>
                )}
            </TouchableOpacity>
            
        </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default AddExpenseScreen;
