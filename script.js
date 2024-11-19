class LifeCalendar {
    constructor() {
        this.birthday = null;
        this.events = [];
        this.selectedEventId = null;
        this.initializeElements();
        this.attachEventListeners();
        this.loadFromLocalStorage();
    }

    initializeElements() {
        // Forms and sections
        this.birthdayForm = document.getElementById('birthday-form');
        this.calendarView = document.getElementById('calendar-view');
        this.birthdayInput = document.getElementById('birthday-input');
        this.startButton = document.getElementById('start-button');
        this.calendarGrid = document.getElementById('calendar-grid');
        
        // Event handling elements
        this.addEventButton = document.getElementById('add-event');
        this.resetDataButton = document.getElementById('reset-data');
        this.eventModal = document.getElementById('event-modal');
        this.eventForm = document.getElementById('event-form');
        this.modalTitle = document.getElementById('modal-title');
        this.deleteEventButton = document.getElementById('delete-event');
        this.closeModalButton = document.getElementById('close-modal');
    }

    attachEventListeners() {
        this.startButton.addEventListener('click', () => this.handleBirthdaySubmit());
        this.addEventButton.addEventListener('click', () => this.openEventModal());
        this.resetDataButton.addEventListener('click', () => this.resetAllData());
        this.eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        this.closeModalButton.addEventListener('click', () => this.closeEventModal());
        this.deleteEventButton.addEventListener('click', () => this.deleteEvent());
    }

    loadFromLocalStorage() {
        try {
            const savedBirthday = localStorage.getItem('birthday');
            const savedEvents = localStorage.getItem('events');

            console.log('Loading from localStorage - Birthday:', savedBirthday);
            console.log('Loading from localStorage - Events:', savedEvents);

            if (savedBirthday) {
                this.birthday = new Date(savedBirthday);
                if (isNaN(this.birthday.getTime())) {
                    throw new Error('Invalid birthday date in localStorage');
                }
                this.birthdayInput.value = this.formatDateForInput(this.birthday);
                this.showCalendarView();
            }

            if (savedEvents) {
                // Parse events and normalize dates
                let events = JSON.parse(savedEvents);
                
                // Remove duplicate events (same name and date range)
                const uniqueEvents = new Map();
                events.forEach(event => {
                    const key = `${event.name}-${event.startDate}-${event.endDate}`;
                    uniqueEvents.set(key, event);
                });
                events = Array.from(uniqueEvents.values());
                
                // Normalize all dates to midnight UTC
                this.events = events.map(event => ({
                    ...event,
                    startDate: new Date(event.startDate).toISOString().split('T')[0],
                    endDate: new Date(event.endDate).toISOString().split('T')[0]
                }));
                
                console.log('Normalized events:', this.events);
                
                // Save the normalized events back to localStorage
                localStorage.setItem('events', JSON.stringify(this.events));
            }

            if (this.birthday) {
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            alert('Failed to load saved data. Starting fresh.');
            this.birthday = null;
            this.events = [];
            localStorage.clear();
        }
    }

    saveToLocalStorage() {
        try {
            if (this.birthday) {
                localStorage.setItem('birthday', this.birthday.toISOString());
            }
            console.log('Saving events to localStorage:', this.events);
            localStorage.setItem('events', JSON.stringify(this.events));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            alert('Failed to save data. Your browser storage might be full or disabled.');
        }
    }

    handleBirthdaySubmit() {
        const birthdayValue = this.birthdayInput.value;
        if (!birthdayValue) {
            alert('Please enter your birthday');
            return;
        }

        this.birthday = new Date(birthdayValue);
        this.saveToLocalStorage();
        this.showCalendarView();
        this.renderCalendar();
    }

    showCalendarView() {
        this.birthdayForm.classList.add('hidden');
        this.calendarView.classList.remove('hidden');
    }

    renderCalendar() {
        try {
            console.log('Rendering calendar with birthday:', this.birthday);
            console.log('Current events:', this.events);
            
            this.calendarGrid.innerHTML = '';
            const startDate = new Date(this.birthday);
            
            // Add month labels aligned with birthday
            const monthsContainer = document.createElement('div');
            monthsContainer.className = 'months-container';
            
            // Create an array to store the weeks that belong to each month
            const monthWeeks = new Array(52).fill(null).map((_, weekIndex) => {
                const weekDate = new Date(startDate);
                weekDate.setDate(weekDate.getDate() + (weekIndex * 7));
                return {
                    month: weekDate.getMonth(),
                    year: weekDate.getFullYear()
                };
            });
            
            // Group consecutive weeks by month
            let currentMonth = null;
            let currentWeeks = 0;
            let monthData = [];
            
            monthWeeks.forEach((week, index) => {
                const monthKey = `${week.year}-${week.month}`;
                
                if (monthKey !== currentMonth) {
                    if (currentMonth !== null) {
                        monthData.push({
                            name: new Date(week.year, week.month - 1, 1)
                                .toLocaleString('default', { month: 'short' }),
                            weeks: currentWeeks
                        });
                    }
                    currentMonth = monthKey;
                    currentWeeks = 1;
                } else {
                    currentWeeks++;
                }
                
                // Handle the last month
                if (index === monthWeeks.length - 1) {
                    monthData.push({
                        name: new Date(week.year, week.month, 1)
                            .toLocaleString('default', { month: 'short' }),
                        weeks: currentWeeks
                    });
                }
            });
            
            // Create month labels with flex-basis proportional to their weeks
            monthData.forEach(month => {
                const monthLabel = document.createElement('div');
                monthLabel.className = 'month-label';
                monthLabel.textContent = month.name;
                monthLabel.style.flexBasis = `${(month.weeks / 52) * 100}%`;
                monthsContainer.appendChild(monthLabel);
            });
            
            this.calendarGrid.appendChild(monthsContainer);

            // Render grid cells
            const totalCells = 52 * 100;
            for (let i = 0; i < totalCells; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                const weekStart = new Date(startDate);
                weekStart.setDate(weekStart.getDate() + (i * 7));
                
                // Create a deep copy for the week end date
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const events = this.getEventsForWeek(weekStart);
                
                if (events.length > 0) {
                    console.log(`Cell ${i}: Found events for week ${weekStart.toISOString()} - ${weekEnd.toISOString()}:`, events);
                }
                
                // Add tooltip with date range and event name if present
                let tooltip = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
                if (events.length > 0) {
                    tooltip += `\n${events[0].name}`;
                    cell.className += ' has-event';
                    cell.style.backgroundColor = events[0].color;
                    cell.addEventListener('click', () => this.openEventModal(events[0]));
                }
                cell.title = tooltip;

                this.calendarGrid.appendChild(cell);
            }
        } catch (error) {
            console.error('Error rendering calendar:', error);
        }
    }

    getEventsForWeek(weekDate) {
        try {
            return this.events.filter(event => {
                // Convert all dates to midnight UTC for comparison
                const startDate = new Date(event.startDate + 'T00:00:00.000Z');
                const endDate = new Date(event.endDate + 'T00:00:00.000Z');
                const weekStart = new Date(weekDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.warn('Invalid dates in event:', event);
                    return false;
                }

                // Check if the week overlaps with the event
                const hasOverlap = (weekStart <= endDate && weekEnd >= startDate);
                
                if (hasOverlap) {
                    console.log('Event overlaps with week:', {
                        weekStart: weekStart.toISOString(),
                        weekEnd: weekEnd.toISOString(),
                        eventStart: startDate.toISOString(),
                        eventEnd: endDate.toISOString(),
                        event: event
                    });
                }
                
                return hasOverlap;
            });
        } catch (error) {
            console.error('Error getting events for week:', weekDate, error);
            return [];
        }
    }

    openEventModal(event = null) {
        this.eventModal.classList.remove('hidden');
        this.modalTitle.textContent = event ? 'Edit Event' : 'Add Event';
        this.deleteEventButton.classList.toggle('hidden', !event);
        this.selectedEventId = event ? event.id : null;

        if (event) {
            document.getElementById('event-name').value = event.name;
            document.getElementById('event-start').value = this.formatDateForInput(new Date(event.startDate));
            document.getElementById('event-end').value = this.formatDateForInput(new Date(event.endDate));
            document.getElementById('event-color').value = event.color;
        } else {
            this.eventForm.reset();
        }
    }

    closeEventModal() {
        this.eventModal.classList.add('hidden');
        this.selectedEventId = null;
        this.eventForm.reset();
    }

    handleEventSubmit(e) {
        e.preventDefault();
        
        try {
            const name = document.getElementById('event-name').value;
            const startDate = new Date(document.getElementById('event-start').value + 'T00:00:00.000Z');
            const endDate = new Date(document.getElementById('event-end').value + 'T00:00:00.000Z');
            const color = document.getElementById('event-color').value;

            // Validate dates
            if (isNaN(startDate.getTime())) {
                throw new Error('Invalid start date');
            }
            if (isNaN(endDate.getTime())) {
                throw new Error('Invalid end date');
            }
            if (endDate < startDate) {
                throw new Error('End date cannot be before start date');
            }
            if (startDate < this.birthday) {
                throw new Error('Event cannot start before your birthday');
            }

            const eventData = {
                id: this.selectedEventId || Date.now(),
                name,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                color
            };

            console.log('Adding/Updating event:', eventData);

            if (this.selectedEventId) {
                const index = this.events.findIndex(e => e.id === this.selectedEventId);
                if (index !== -1) {
                    this.events[index] = eventData;
                    console.log('Updated event at index:', index);
                } else {
                    console.warn('Could not find event to update with ID:', this.selectedEventId);
                }
            } else {
                this.events.push(eventData);
                console.log('Added new event. Total events:', this.events.length);
            }

            this.saveToLocalStorage();
            this.renderCalendar();
            this.closeEventModal();
        } catch (error) {
            console.error('Error handling event submission:', error);
            alert(error.message || 'Failed to save event. Please check the dates and try again.');
        }
    }

    deleteEvent() {
        if (this.selectedEventId) {
            this.events = this.events.filter(e => e.id !== this.selectedEventId);
            this.saveToLocalStorage();
            this.renderCalendar();
            this.closeEventModal();
        }
    }

    resetAllData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            localStorage.removeItem('birthday');
            localStorage.removeItem('events');
            this.birthday = null;
            this.events = [];
            this.calendarView.classList.add('hidden');
            this.birthdayForm.classList.remove('hidden');
            this.birthdayInput.value = '';
        }
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new LifeCalendar();
});
