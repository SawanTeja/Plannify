import { StyleSheet } from 'react-native';

export const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    refreshContainer: {
        padding: 10,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 25,
        color: colors.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        color: colors.textPrimary,
    },
    emptySub: {
        fontSize: 14,
        marginTop: 5,
        color: colors.textSecondary,
    },
    debtCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 15,
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },
    debtInfo: {
        flex: 1,
        marginRight: 10,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    arrowIcon: {
        marginHorizontal: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPayer: {
        backgroundColor: colors.danger + '20',
    },
    avatarPayee: {
        backgroundColor: colors.success + '20',
    },
    avatarTextDanger: {
        color: colors.danger,
        fontWeight: 'bold',
    },
    avatarTextSuccess: {
        color: colors.success,
        fontWeight: 'bold',
    },
    debtDetail: {
        marginTop: 10,
    },
    debtDescription: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    boldText: {
        fontWeight: 'bold',
    },
    amountText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 4,
        color: colors.textPrimary,
    },
    settleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 90,
        justifyContent: 'center',
    },
    settleBtnActive: {
        backgroundColor: colors.primary,
    },
    settleBtnInactive: {
        backgroundColor: colors.surfaceHighlight,
    },
    settleBtnTextActive: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    settleBtnTextInactive: {
        color: colors.primary,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});
