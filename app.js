// ניהול מצב האפליקציה
class BudgetManager {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.formatMonth(this.currentDate);
        this.data = { incomes: [], expenses: [] };
        this.currentItemType = null; // 'income' or 'expense'
        this.currentUser = null;
        this.unsubscribeFromData = null;
        this.checkAuth();
    }

    async checkAuth() {
        // בדוק אם המשתמש מחובר
        FirebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadData();
                this.init();
                this.setupRealtimeSync();
            } else {
                // אם אין משתמש מחובר, העבר לדף התחברות
                window.location.href = 'auth.html';
            }
        });
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.updateUserInfo();
    }

    updateUserInfo() {
        // הצג מידע על המשתמש המחובר
        if (this.currentUser) {
            const email = this.currentUser.email;
            const userInfoEl = document.getElementById('userEmail');
            if (userInfoEl) {
                userInfoEl.textContent = email;
            }
        }
    }

    setupRealtimeSync() {
        // האזן לשינויים בזמן אמת
        if (this.currentUser) {
            this.unsubscribeFromData = FirebaseDB.onUserDataChanged(
                this.currentUser.uid,
                (data) => {
                    if (data) {
                        this.data = data;
                        this.updateDisplay();
                    }
                }
            );
        }
    }

    formatMonth(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    getMonthName(monthString) {
        const [year, month] = monthString.split('-');
        const date = new Date(year, parseInt(month) - 1);
        const monthNames = [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
        ];
        return `${monthNames[date.getMonth()]} ${year}`;
    }

    setupEventListeners() {
        // ניווט חודשים
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // כפתורי הוספה
        document.getElementById('addIncomeBtn').addEventListener('click', () => this.openModal('income'));
        document.getElementById('addExpenseBtn').addEventListener('click', () => this.openModal('expense'));

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // סוג פריט - הצג/הסתר בחירת חודש
        document.getElementById('itemType').addEventListener('change', (e) => {
            const monthGroup = document.getElementById('monthSelectGroup');
            if (e.target.value === 'one-time') {
                monthGroup.style.display = 'block';
            } else {
                monthGroup.style.display = 'none';
            }
        });

        // סגירת modal בלחיצה מחוץ לתוכן
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    changeMonth(direction) {
        const [year, month] = this.currentMonth.split('-');
        const date = new Date(year, parseInt(month) - 1);
        date.setMonth(date.getMonth() + direction);
        this.currentMonth = this.formatMonth(date);
        this.updateDisplay();
    }

    openModal(type) {
        this.currentItemType = type;
        const modal = document.getElementById('modal');
        const title = document.getElementById('modalTitle');
        const monthInput = document.getElementById('itemMonth');

        title.textContent = type === 'income' ? 'הוסף הכנסה' : 'הוסף הוצאה';
        monthInput.value = this.currentMonth;

        // איפוס הטופס
        document.getElementById('itemForm').reset();
        document.getElementById('itemType').value = 'one-time';
        document.getElementById('monthSelectGroup').style.display = 'block';

        modal.classList.add('show');
    }

    closeModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('show');
        this.currentItemType = null;
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('itemName').value.trim();
        const amount = parseFloat(document.getElementById('itemAmount').value);
        const type = document.getElementById('itemType').value;
        const month = type === 'one-time' ? document.getElementById('itemMonth').value : null;

        const item = {
            id: Date.now(),
            name,
            amount,
            type, // 'one-time' or 'recurring'
            month, // null for recurring items
            checked: true // ברירת מחדל - מסומן
        };

        // הוסף את הפריט למערך המתאים
        if (this.currentItemType === 'income') {
            if (!this.data.incomes) this.data.incomes = [];
            this.data.incomes.push(item);
        } else {
            if (!this.data.expenses) this.data.expenses = [];
            this.data.expenses.push(item);
        }

        this.saveData();
        this.updateDisplay();
        this.closeModal();
    }

    deleteItem(id, category) {
        if (confirm('האם אתה בטוח שברצונך למחוק פריט זה?')) {
            this.data[category] = this.data[category].filter(item => item.id !== id);
            this.saveData();
            this.updateDisplay();
        }
    }

    toggleItem(id, category) {
        const item = this.data[category].find(item => item.id === id);
        if (item) {
            item.checked = !item.checked;
            this.saveData();
            this.updateDisplay();
        }
    }

    getItemsForMonth(items, month) {
        return items.filter(item => {
            // פריטים קבועים מופיעים בכל חודש
            if (item.type === 'recurring') {
                return true;
            }
            // פריטים חד פעמיים מופיעים רק בחודש שלהם
            return item.month === month;
        });
    }

    renderItems(items, category) {
        const container = document.getElementById(category === 'incomes' ? 'incomeList' : 'expenseList');
        const monthItems = this.getItemsForMonth(items || [], this.currentMonth);

        if (monthItems.length === 0) {
            container.innerHTML = '<div class="empty-state">אין פריטים להצגה</div>';
            return;
        }

        container.innerHTML = monthItems.map(item => `
            <div class="item ${item.checked ? '' : 'completed'}">
                <div class="item-right">
                    <input
                        type="checkbox"
                        class="item-checkbox"
                        ${item.checked ? 'checked' : ''}
                        onchange="budgetManager.toggleItem(${item.id}, '${category}')"
                    />
                    <div class="item-details">
                        <div class="item-name">
                            <span class="item-badge ${item.type === 'recurring' ? 'badge-recurring' : 'badge-onetime'}">
                                ${item.type === 'recurring' ? 'קבוע' : 'חד פעמי'}
                            </span>
                            ${item.name}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span class="item-amount">₪${item.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                    <div class="item-actions">
                        <button class="delete-btn" onclick="budgetManager.deleteItem(${item.id}, '${category}')">
                            מחק
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    calculateTotal(items, month) {
        const monthItems = this.getItemsForMonth(items || [], month);
        return monthItems
            .filter(item => item.checked)
            .reduce((sum, item) => sum + item.amount, 0);
    }

    updateDisplay() {
        // עדכן כותרת החודש
        document.getElementById('currentMonth').textContent = this.getMonthName(this.currentMonth);

        // עדכן רשימות
        this.renderItems(this.data.incomes, 'incomes');
        this.renderItems(this.data.expenses, 'expenses');

        // חשב סכומים
        const totalIncome = this.calculateTotal(this.data.incomes, this.currentMonth);
        const totalExpense = this.calculateTotal(this.data.expenses, this.currentMonth);
        const balance = totalIncome - totalExpense;

        // עדכן תצוגה
        document.getElementById('totalIncome').textContent =
            `₪${totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
        document.getElementById('totalExpense').textContent =
            `₪${totalExpense.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
        document.getElementById('balance').textContent =
            `₪${balance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;

        // שנה צבע יתרה לפי ערך
        const balanceElement = document.getElementById('balance');
        if (balance > 0) {
            balanceElement.style.color = '#28a745';
        } else if (balance < 0) {
            balanceElement.style.color = '#dc3545';
        } else {
            balanceElement.style.color = '#667eea';
        }
    }

    async loadData() {
        if (!this.currentUser) return;

        const result = await FirebaseDB.loadUserData(this.currentUser.uid);
        if (result.success && result.data) {
            this.data = result.data;
        } else {
            // אם אין נתונים, נסה לטעון מ-localStorage (מיגרציה)
            const localData = this.loadFromLocalStorage();
            if (localData) {
                this.data = localData;
                // שמור ב-Firestore
                await this.saveData();
                // נקה localStorage
                localStorage.removeItem('budgetData');
            } else {
                this.data = {
                    incomes: [],
                    expenses: []
                };
            }
        }
    }

    loadFromLocalStorage() {
        // טעינה מ-localStorage למיגרציה
        const savedData = localStorage.getItem('budgetData');
        if (savedData) {
            return JSON.parse(savedData);
        }
        return null;
    }

    async saveData() {
        if (!this.currentUser) return;

        const result = await FirebaseDB.saveUserData(this.currentUser.uid, this.data);
        if (!result.success) {
            console.error('Failed to save data:', result.error);
            alert('שגיאה בשמירת הנתונים. נסה שוב.');
        }
    }

    async logout() {
        // נתק את ההאזנה לשינויים
        if (this.unsubscribeFromData) {
            this.unsubscribeFromData();
        }

        // התנתק
        const result = await FirebaseAuth.signOut();
        if (result.success) {
            window.location.href = 'auth.html';
        }
    }
}

// אתחול האפליקציה
let budgetManager;
document.addEventListener('DOMContentLoaded', () => {
    budgetManager = new BudgetManager();
});
