// ניהול מצב האפליקציה
class BudgetManager {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.formatMonth(this.currentDate);
        this.data = this.loadData();
        this.currentItemType = null; // 'income' or 'expense'
        this.currentEditingItem = null; // פריט שנערך כרגע
        this.tempSubItems = []; // תתי-פריטים זמניים
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
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

        // סוג פריט - הצג/הסתר בחירת חודש ותתי-פריטים
        document.getElementById('itemType').addEventListener('change', (e) => {
            const monthGroup = document.getElementById('monthSelectGroup');
            const hasSubItemsGroup = document.getElementById('hasSubItemsGroup');
            const hasSubItemsCheckbox = document.getElementById('hasSubItems');
            const itemAmount = document.getElementById('itemAmount');

            if (e.target.value === 'one-time') {
                monthGroup.style.display = 'block';
                hasSubItemsGroup.style.display = 'none';
                hasSubItemsCheckbox.checked = false;
                itemAmount.required = true;
                itemAmount.disabled = false;
            } else if (e.target.value === 'recurring-fixed') {
                monthGroup.style.display = 'none';
                hasSubItemsGroup.style.display = 'block';
                itemAmount.required = true;
                if (!hasSubItemsCheckbox.checked) {
                    itemAmount.disabled = false;
                }
            } else if (e.target.value === 'recurring-variable') {
                monthGroup.style.display = 'none';
                hasSubItemsGroup.style.display = 'block';
                itemAmount.required = false;
                itemAmount.value = '0';
                if (!hasSubItemsCheckbox.checked) {
                    itemAmount.disabled = false;
                }
            }
        });

        // תתי-פריטים - הצג/הסתר שדה סכום
        document.getElementById('hasSubItems').addEventListener('change', (e) => {
            const itemAmount = document.getElementById('itemAmount');
            if (e.target.checked) {
                itemAmount.required = false;
                itemAmount.value = '0';
                itemAmount.disabled = true;
            } else {
                itemAmount.required = true;
                itemAmount.disabled = false;
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
        document.getElementById('hasSubItemsGroup').style.display = 'none';
        document.getElementById('hasSubItems').checked = false;
        document.getElementById('itemAmount').disabled = false;
        document.getElementById('itemAmount').required = true;

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
        const amount = parseFloat(document.getElementById('itemAmount').value) || 0;
        const type = document.getElementById('itemType').value;
        const month = type === 'one-time' ? document.getElementById('itemMonth').value : null;
        const hasSubItems = document.getElementById('hasSubItems').checked;

        const item = {
            id: Date.now(),
            name,
            amount,
            type, // 'one-time', 'recurring-fixed', 'recurring-variable'
            month, // null for recurring items
            checked: true, // ברירת מחדל - מסומן
            isVariableAmount: type === 'recurring-variable',
            monthlyAmounts: {}, // סכומים חודשיים למשתנה
            hasSubItems: hasSubItems,
            subItems: [] // תתי-פריטים
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

        // אם יש תתי-פריטים, פתח מיד modal לניהול
        if (hasSubItems) {
            setTimeout(() => this.openSubItemsModal(item.id, this.currentItemType), 100);
        }
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
            if (item.type === 'recurring' || item.type === 'recurring-fixed' || item.type === 'recurring-variable') {
                return true;
            }
            // פריטים חד פעמיים מופיעים רק בחודש שלהם
            return item.month === month;
        });
    }

    getItemAmount(item, month) {
        // אם יש תתי-פריטים, חשב את הסכום הכולל
        if (item.hasSubItems && item.subItems && item.subItems.length > 0) {
            return item.subItems
                .filter(sub => sub.checked)
                .reduce((sum, sub) => sum + (sub.amount || 0), 0);
        }

        // אם זה סכום משתנה, קח את הסכום לחודש הנוכחי
        if (item.isVariableAmount && item.monthlyAmounts && item.monthlyAmounts[month] !== undefined) {
            return item.monthlyAmounts[month];
        }

        // אחרת, החזר את הסכום הרגיל
        return item.amount || 0;
    }

    renderItems(items, category) {
        const container = document.getElementById(category === 'incomes' ? 'incomeList' : 'expenseList');
        const monthItems = this.getItemsForMonth(items || [], this.currentMonth);

        if (monthItems.length === 0) {
            container.innerHTML = '<div class="empty-state">אין פריטים להצגה</div>';
            return;
        }

        container.innerHTML = monthItems.map(item => {
            const itemAmount = this.getItemAmount(item, this.currentMonth);
            const isRecurring = item.type !== 'one-time';
            const badgeText = item.type === 'one-time' ? 'חד פעמי' :
                             item.type === 'recurring-variable' ? 'קבוע משתנה' :
                             item.type === 'recurring-fixed' ? 'קבוע' : 'קבוע';

            let extraButtons = '';
            if (item.hasSubItems) {
                extraButtons += `<button class="edit-btn" onclick="budgetManager.openSubItemsModal(${item.id}, '${category}')">
                    ניהול תתי-פריטים
                </button>`;
            }
            if (item.isVariableAmount) {
                extraButtons += `<button class="edit-btn" onclick="budgetManager.openAmountModal(${item.id}, '${category}')">
                    עדכן סכום
                </button>`;
            }

            // הצג תתי-פריטים אם יש
            let subItemsHTML = '';
            if (item.hasSubItems && item.subItems && item.subItems.length > 0) {
                subItemsHTML = '<div class="sub-items">' +
                    item.subItems.map(sub => `
                        <div class="sub-item ${sub.checked ? '' : 'completed'}">
                            <span class="sub-item-name">${sub.name}</span>
                            <span class="sub-item-amount">₪${(sub.amount || 0).toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                        </div>
                    `).join('') + '</div>';
            }

            return `
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
                                <span class="item-badge ${isRecurring ? 'badge-recurring' : 'badge-onetime'}">
                                    ${badgeText}
                                </span>
                                ${item.name}
                            </div>
                            ${subItemsHTML}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="item-amount">₪${itemAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                        <div class="item-actions">
                            ${extraButtons}
                            <button class="delete-btn" onclick="budgetManager.deleteItem(${item.id}, '${category}')">
                                מחק
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateTotal(items, month) {
        const monthItems = this.getItemsForMonth(items || [], month);
        return monthItems
            .filter(item => item.checked)
            .reduce((sum, item) => sum + this.getItemAmount(item, month), 0);
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

    loadData() {
        const savedData = localStorage.getItem('budgetData');
        if (savedData) {
            const data = JSON.parse(savedData);

            // תמיכה בתאימות לאחור - המרה של פריטים ישנים לפורמט החדש
            ['incomes', 'expenses'].forEach(category => {
                if (data[category]) {
                    data[category] = data[category].map(item => {
                        // אם יש type='recurring' ישן, המר ל-recurring-fixed
                        if (item.type === 'recurring') {
                            item.type = 'recurring-fixed';
                        }

                        // ודא שיש את כל השדות החדשים
                        return {
                            ...item,
                            isVariableAmount: item.isVariableAmount || (item.type === 'recurring-variable'),
                            monthlyAmounts: item.monthlyAmounts || {},
                            hasSubItems: item.hasSubItems || false,
                            subItems: item.subItems || []
                        };
                    });
                }
            });

            return data;
        }
        return {
            incomes: [],
            expenses: []
        };
    }

    saveData() {
        localStorage.setItem('budgetData', JSON.stringify(this.data));
    }

    // ===== ניהול תתי-פריטים =====

    openSubItemsModal(itemId, category) {
        const item = this.data[category].find(i => i.id === itemId);
        if (!item) return;

        this.currentEditingItem = { id: itemId, category };
        this.tempSubItems = JSON.parse(JSON.stringify(item.subItems || []));

        document.getElementById('subItemsModalTitle').textContent = `ניהול תתי-פריטים - ${item.name}`;
        this.renderSubItems();

        const modal = document.getElementById('subItemsModal');
        modal.classList.add('show');
    }

    closeSubItemsModal() {
        const modal = document.getElementById('subItemsModal');
        modal.classList.remove('show');
        this.currentEditingItem = null;
        this.tempSubItems = [];
        document.getElementById('subItemName').value = '';
        document.getElementById('subItemAmount').value = '';
    }

    renderSubItems() {
        const container = document.getElementById('subItemsList');

        if (this.tempSubItems.length === 0) {
            container.innerHTML = '<div class="empty-state">אין תתי-פריטים. הוסף תת-פריט חדש למטה.</div>';
            return;
        }

        container.innerHTML = this.tempSubItems.map((sub, index) => `
            <div class="sub-item-row">
                <input
                    type="checkbox"
                    ${sub.checked ? 'checked' : ''}
                    onchange="budgetManager.toggleSubItem(${index})"
                />
                <span class="sub-item-name">${sub.name}</span>
                <span class="sub-item-amount">₪${(sub.amount || 0).toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                <button class="delete-btn" onclick="budgetManager.deleteSubItem(${index})">מחק</button>
            </div>
        `).join('');
    }

    addSubItem() {
        const name = document.getElementById('subItemName').value.trim();
        const amount = parseFloat(document.getElementById('subItemAmount').value) || 0;

        if (!name) {
            alert('נא להזין שם לתת-פריט');
            return;
        }

        this.tempSubItems.push({
            id: Date.now(),
            name,
            amount,
            checked: true
        });

        document.getElementById('subItemName').value = '';
        document.getElementById('subItemAmount').value = '';
        this.renderSubItems();
    }

    deleteSubItem(index) {
        if (confirm('האם למחוק תת-פריט זה?')) {
            this.tempSubItems.splice(index, 1);
            this.renderSubItems();
        }
    }

    toggleSubItem(index) {
        this.tempSubItems[index].checked = !this.tempSubItems[index].checked;
        this.renderSubItems();
    }

    saveSubItems() {
        if (!this.currentEditingItem) return;

        const { id, category } = this.currentEditingItem;
        const item = this.data[category].find(i => i.id === id);
        if (item) {
            item.subItems = this.tempSubItems;
            this.saveData();
            this.updateDisplay();
        }

        this.closeSubItemsModal();
    }

    // ===== ניהול סכומים משתנים =====

    openAmountModal(itemId, category) {
        const item = this.data[category].find(i => i.id === itemId);
        if (!item) return;

        this.currentEditingItem = { id: itemId, category };

        const currentAmount = item.monthlyAmounts && item.monthlyAmounts[this.currentMonth] !== undefined
            ? item.monthlyAmounts[this.currentMonth]
            : item.amount || 0;

        document.getElementById('amountModalTitle').textContent = `עדכן סכום - ${item.name}`;
        document.getElementById('amountModalLabel').textContent = `סכום לחודש ${this.getMonthName(this.currentMonth)}:`;
        document.getElementById('monthlyAmount').value = currentAmount;

        const modal = document.getElementById('amountModal');
        modal.classList.add('show');
    }

    closeAmountModal() {
        const modal = document.getElementById('amountModal');
        modal.classList.remove('show');
        this.currentEditingItem = null;
    }

    saveMonthlyAmount() {
        if (!this.currentEditingItem) return;

        const { id, category } = this.currentEditingItem;
        const item = this.data[category].find(i => i.id === id);
        if (item) {
            const amount = parseFloat(document.getElementById('monthlyAmount').value) || 0;

            if (!item.monthlyAmounts) {
                item.monthlyAmounts = {};
            }

            item.monthlyAmounts[this.currentMonth] = amount;
            this.saveData();
            this.updateDisplay();
        }

        this.closeAmountModal();
    }
}

// אתחול האפליקציה
let budgetManager;
document.addEventListener('DOMContentLoaded', () => {
    budgetManager = new BudgetManager();
});
