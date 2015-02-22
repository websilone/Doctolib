/**
 * Notice : the reason I choose to create most of the functions on the prototype instead of
 * "private" functions is for testability purposes.
 * If we would have wanted to write unit tests, it would have been a lot easier to test each function this way.
 */

var Calendar = (function () {
    'use strict';

    var daysInWeek = 7;
    var calendarHeight = 0;

    /**
     * Create a new calendar attached to the given DOM selector
     * @param selector {string} CSS Selector to get the target container
     * @param start_date {Date} First date to display in the calendar
     * @param agenda {Array} List of appointments to show in the calendar
     */
    var calendar = function (selector, start_date, agenda) {

        /**
         * if the given parameters are incorrect, alert and return.
         */
        if (typeof selector !== 'string' || selector === '' || !start_date instanceof Date || !agenda instanceof Array) {
            alert('Invalid parameters');
            return;
        }

        this.agenda = {};
        this.container = document.querySelector(selector);
        this.start_date = new Date(start_date.getFullYear(), start_date.getMonth(), start_date.getDate());

        this.init();
        this.fillAgenda(agenda);
        this.showAgenda();
    };

    /**
     * Creates the calendar empty structure
     */
    calendar.prototype.init = function () {
        this.table = document.createElement('table');
        this.table.className = 'week week-' + daysInWeek;

        this.createHeader();
        this.createDays();

        this.container.appendChild(this.table);
        calendarHeight = this.table.getElementsByTagName('tr')[1].clientHeight;
    };

    /**
     * Creates the calendar header to show dates
     */
    calendar.prototype.createHeader = function () {
        var row = document.createElement('tr');
        row.className = 'head';
        var i;

        for(i=0; i < daysInWeek; i++){
            var currentDate = new Date(this.start_date.getTime() + (3600 * 1000 * 24) * i);

            var day = document.createElement('th');
            day.className = 'day';
            day.innerHTML = currentDate.toDateString();

            row.appendChild(day);

            this.agenda[currentDate.getTime()] = {
                  appointments : []
                , node : {}
            }
        }

        this.table.appendChild(row);
    };

    /**
     * Creates the calendar days structure
     */
    calendar.prototype.createDays = function () {
        var row = document.createElement('tr');
        row.className = 'content';

        for(var day in this.agenda){
            var node = document.createElement('td');
            node.className = 'day';
            row.appendChild(node);
            this.agenda[day].node = node;
        }

        this.table.appendChild(row);
    };

    /**
     * Loops through the given agenda data and creates appointments objects
     * Adds the appointments objects to their corresponding day in the local agenda object (this.agenda).
     * @param agenda {Array}
     */
    calendar.prototype.fillAgenda = function (agenda) {
        var i;

        for(i=0; i < agenda.length; i++){
            var data = agenda[i];
            var apmt = new Appointment(data.start_date, data.end_date, data.title);

            if (apmt.isValid) {
                var time = apmt.reference_date.getTime();
                if (this.agenda[time]) {
                    this.agenda[time].appointments.push(apmt);
                }
            }
        }
    };

    /**
     * For each days, it sorts the appointments by their ascending start time.
     * Then it displays the appointments in the agenda table.
     */
    calendar.prototype.showAgenda = function () {
        for(var day in this.agenda){
            var d = this.agenda[day];
            var nbAppointments = d.appointments.length;

            d.appointments = this.sortAppointments(d.appointments);
            this.checkCollisions(d);
            for(var i=0; i < d.appointments.length; i++){
                this.addAppointment(d.appointments[i], d.node, nbAppointments, i);
            }
        }
    };

    /**
     * Sorts the given appointments by their ascending start time.
     * @param appointments {Array}
     * @returns {Array}
     */
    calendar.prototype.sortAppointments = function (appointments) {
        return appointments.sort(sortByStartTime);
    };

    /**
     * Checks if some appointments overrides each other in order to give them the right width
     * and the right position later on.
     * This result of this treatment could be improve to handle the placement in a better way
     * but it's beyond the purpose of this test.
     * @param day {object}
     */
    calendar.prototype.checkCollisions = function (day) {
        var firstApp, groups = [];

        if (day.appointments.length > 0) {
            firstApp = day.appointments[0];

            groups.push({
                  min : firstApp.start_time
                , max : firstApp.end_time
                , apps : [firstApp]
            });

            /**
             * Loops through the appointments, starting with the second one
             */
            for (var i=1; i<day.appointments.length; i++){
                var a = day.appointments[i];
                var cover = false;

                /**
                 * Loops through the created groups of appointments
                 */
                for(var j=0; j<groups.length; j++){
                    var g = groups[j];

                    /**
                     * if the start time of the current appointment is between the group boundaries
                     * add the appointment to the group
                     * and stop the loop
                     */
                    if (a.start_time >= g.min && a.start_time <= g.max) {
                        g.apps.push(a);
                        cover = true;

                        /**
                         * if the end time of the appointment is greater than the max end time of the group
                         * update the max end time of the group
                         */
                        if (a.end_time > g.max) {
                            g.max = a.end_time;
                        }

                        break;
                    }
                }

                /**
                 * if no override occured during the loops,
                 * create a new group and push it to the groups array
                 */
                if (!cover) {
                    groups.push({
                        min : a.start_time
                        , max : a.end_time
                        , apps : [a]
                    });
                }
            }
        }

        /**
         * After the groups have been created,
         * loop through them and update the appointments object
         * to give them the right position values (index and nb of appointment in their group, ie nb of appointments to display on the same line)
         */
        for(var i= 0; i<groups.length; i++){
            var g = groups[i];
            var nbApps = g.apps.length;

            for(var j=0; j<g.apps.length; j++){
                var a = g.apps[j];

                a.index = j;
                a.nbInCollision = nbApps;
            }
        }
    };

    /**
     * Creates an appointment DOM object and appends it to the given DOM node
     * @param apmt {Appointment}
     * @param node {Object} DOM Object of the day where the appointment node will be added
     * @param nb {Number} Number of appointments in the same day
     * @param pos {Number} Index of the current appointment in the day
     */
    calendar.prototype.addAppointment = function (apmt, node, nb, pos) {
        var div = document.createElement('div');
        div.className = 'appointment pos-' + pos;

        var p = document.createElement('p');
        p.innerHTML = apmt.getFormattedStartTime();
        p.innerHTML += ' - ';
        p.innerHTML += apmt.title;

        var top = ((apmt.start_time * calendarHeight) / 24) + 'px';
        div.style.top = top;

        var height = ((apmt.duration * calendarHeight) / 24) + 'px';
        div.style.height = height;

        var width = (100 - (apmt.nbInCollision*2)) / apmt.nbInCollision;
        div.style.width = width + '%';

        var left = (width * apmt.index) + (apmt.index * 2) + 1;
        div.style.left = left + '%';

        div.appendChild(p);
        node.appendChild(div);
    };

    function sortByStartTime(a, b){
        if (a.start_time < b.start_time) {
            return -1;
        }

        if (a.start_time > b.start_time) {
            return 1;
        }

        return 0;
    }

    return calendar;
})();

var Appointment = (function () {
    'use strict';

    /**
     * Creates a new Appointment object and sets local variables
     * @param start_date {Date}
     * @param end_date {Date}
     * @param title {String}
     */
    var appt = function (start_date, end_date, title) {
        this.start_date = (start_date instanceof Date) ? start_date : null;
        this.end_date = (end_date instanceof Date) ? end_date : null;
        this.title = (typeof title === 'string') ? title : '';

        if (this.start_date === null || this.end_date === null) {
            this.isValid = false;
            return;
        }
        else{
            this.isValid = true;
        }

        this.reference_date = this.getReferenceDate();

        /**
         * if the end date is before the start date,
         * change it to start date + 2 hour.
         */
        if (this.end_date < this.start_date) {
            this.end_date = new Date(this.start_date.getTime() + (3600 * 2000));
        }

        this.start_time = this.getTimeInNumber(this.start_date);
        this.end_time = this.getTimeInNumber(this.end_date);
        this.duration = this.setDuration();
    };

    /**
     * Gets the start_date set at midnight
     * @returns {Date}
     */
    appt.prototype.getReferenceDate = function () {
        return new Date(this.start_date.getFullYear(), this.start_date.getMonth(), this.start_date.getDate());
    };

    /**
     * Calculates the appointment duration in hours
     * returns 1 as default duration is negative
     * @returns {number} Nb of hours
     */
    appt.prototype.setDuration = function () {
        return this.end_time - this.start_time;
    };

    /**
     * Convert the hour (as 9h30) of the date into a decimal value
     * Example : 9h30 -> 9,5
     * @param date
     * @returns {number}
     */
    appt.prototype.getTimeInNumber = function (date) {
        var time = 0;
        var refDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        time = ((date.getTime() - refDate.getTime()) / 1000) / 3600;

        return time;
    };

    /**
     * Gets the formatted time of the beginning of the appointment
     * @returns {string}
     */
    appt.prototype.getFormattedStartTime = function () {
        var time = '';
        var hour = this.start_date.getHours();
        var minutes = this.start_date.getMinutes();

        if (hour < 10) {
            hour = '0' + hour;
        }

        if (minutes < 10) {
            minutes = '0' + minutes;
        }

        time += hour;
        time += ':';
        time += minutes;

        return time;
    };

    return appt;
})();
