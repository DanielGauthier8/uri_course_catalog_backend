/* eslint-disable max-len */
// Copyright 2018, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// Import the Dialogflow module and response creation dependencies
// from the Actions on Google client library.
const {
    dialogflow,
    Permission,
    Suggestions,
} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');


// Instantiate the Dialogflow client
const app = dialogflow({debug: true});

// API keys
// const configuration = require('./configure/keys');
// The Subjects and associated course code
const subjectTable = require('./configure/subject_lookup');

// const APIKey = configuration.API_key;

/* const baseURL = '';// 'https://api.uri.edu/v1/catalog/courses/';*/
// const test = 'api.uri.edu/v1/catalog/courses/CSC/200';

/*
* Returns what is being requested from the server
* @return      the image at the specified URL
 */

// + baseURL + subject + courseNum + minNum + maxNum
// my not work with enter after request
// maybe strict mode


/* ###########################Helper Functions######################################## */

/* const checkServer = function() {
    request
        .post(test).form({id: APIKey})
        .on('response', function (response) {
            console.log(response.statusCode); // 200
            console.log(response.headers['content-type']);
            if (response.statusCode === 200) {
                responseM = 'sweet';
            }
        });
};*/

const suggestionsAfter = function (conversation) {
    conversation.ask(new Suggestions('Specific course', 'All courses in a subject'
        , 'Courses within a range', 'No Thanks'));
};

const commonResponse = function (conversation, courseSubject, courseNumber1, courseNumber2) {
    const courseCode = subjectTable[courseSubject];
    if (courseNumber1 === null) {
        conversation.ask('I will get information about ' +
            courseSubject + ' classes.' +
            'Would you like to hear about another class?');
    } else if (courseNumber2 === null) {
        conversation.ask('I will get information about ' +
            courseSubject + ' ' + courseNumber1 + '. Also known as ' + courseCode +
            '. Would you like to hear about another class?');
    } else {
        conversation.ask('I will get information about ' +
            courseSubject + ' classes between ' + courseNumber1 + ' and '
            + courseNumber2 + '. Would you like to hear about another class?');
    }
    suggestionsAfter(conversation);
};

// fs.createReadStream('file.json').pipe(request.put('http://mysite.com/obj.json'))

/* ###########################App Intents######################################## */
app.intent('Default Welcome Intent', (conversation) => {
    const name = conversation.user.storage.userName;
    if (!name) {
        // Asks the user's permission to know their name, for personalization.
        conversation.ask(new Permission({
            context: 'Hi there, so I can call you by your name',
            permissions: 'NAME',
        }));
    } else {
        const firstName = name.substring(0, name.indexOf(' '));
        conversation.ask('Hi again ' + firstName + ', What do you want to look up?');
        suggestionsAfter(conversation);
    }
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conversation, params, permissionGranted) => {
    if (!permissionGranted) {
        // If the user denied our request, go ahead with the conversation.
        conversation.ask('Ok, no worries, what do you want to look up?');
        suggestionsAfter(conversation);
    } else {
        // If the user accepted our request, store their name in
        // the 'conversation.user.storage' object for the duration of the conversation.
        conversation.user.storage.userName = conversation.user.name.display;
        conversation.ask('Thanks, ' + conversation.user.storage.userName + '. What do you' +
            ' want to look up?');
        suggestionsAfter(conversation);
    }
});


app.intent('course_specific', (conversation, {courseSubject, courseNumber1}) => {
    commonResponse(conversation, courseSubject, courseNumber1, null);
});

app.intent('courses_in_a_subject', (conversation, {courseSubject}) => {
    commonResponse(conversation, courseSubject, null, null);
});

app.intent('courses_in_a_range', (conversation, {courseSubject, courseNumber1, courseNumber2}) => {
    commonResponse(conversation, courseSubject, courseNumber1, courseNumber2);
});


// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);

// Handle the Dialogflow NO_INPUT intent.
// Triggered when the user doesn't provide input to the Action
app.intent('actions_intent_NO_INPUT', (conversation) => {
    // Use the number of reprompts to vary response
    const repromptCount = parseInt(conversation.arguments.get('REPROMPT_COUNT'));
    if (repromptCount === 0) {
        conversation.ask('What would you like to hear about?');
    } else if (repromptCount === 1) {
        conversation.ask('Please say the name of a class or course number.');
    } else if (conversation.arguments.get('IS_FINAL_REPROMPT')) {
        conversation.close('Sorry we\'re having trouble. Let\'s ' +
            'try this again later. Goodbye.');
    }
});
