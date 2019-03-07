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

const request = require('request');
// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client
const app = dialogflow({debug: true});

// API keys
const configuration = require('./configure/keys');
// The Subjects and associated course code
const subjectTable = require('./configure/subject_lookup');

const APIKey = configuration.API_key;

let baseURL = '';// 'https://api.uri.edu/v1/catalog/courses/';
let subject = '';
let courseNum = '';
let minNum = '';
let maxNum = '';
let test = 'api.uri.edu/v1/catalog/courses/CSC/200 \n';
let responseM = '';


/*
* Returns what is being requested from the server
* @return      the image at the specified URL
 */

// + baseURL + subject + courseNum + minNum + maxNum
// my not work with enter after request
// maybe strict mode
const checkServer = function() {
    request
        .post(test).form({id: APIKey})
        .on('response', function(response) {
            console.log(response.statusCode); // 200
            console.log(response.headers['content-type']);
            if (response.statusCode === 200) {
                responseM = 'sweet';
            }
        });
};

const suggestionsAfter = function (conv) {
    conv.ask(new Suggestions('Specific course', 'All courses in a subject'
        , 'Courses within a range', 'No'));
}


// fs.createReadStream('file.json').pipe(request.put('http://mysite.com/obj.json'))

// Handle the Dialogflow intent named 'Default Welcome Intent'.
app.intent('Default Welcome Intent', (conv) => {
    const name = conv.user.storage.userName;
    if (!name) {
        // Asks the user's permission to know their name, for personalization.
        conv.ask(new Permission({
            context: 'Hi there, so I can call you by your name',
            permissions: 'NAME',
        }));
    } else {
        const firstName = name.substring(0, name.indexOf(' '));
        conv.ask('Hi again ' + firstName + ', What do you want to look up?');
        suggestionsAfter(conv);
    }
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        // If the user denied our request, go ahead with the conversation.
        conv.ask('Ok, no worries, what do you want to look up?');
        suggestionsAfter(conv);

    } else {
        // If the user accepted our request, store their name in
        // the 'conv.user.storage' object for the duration of the conversation.
        conv.user.storage.userName = conv.user.name.display;
        conv.ask('Thanks, ' + conv.user.storage.userName + '. What do you' +
            ' want to look up?');
        suggestionsAfter(conv);

    }
});


app.intent('course_specific', (conv, {courseSubject, courseNumber}) => {
    checkServer();// pass conv,courseSubject,number,and code
    conv.ask('I will get information about ' +
        courseSubject + ' ' + courseNumber + '. Also known as ' +
        courseCode + responseM +' ' + courseNumber +
        '. Would you like to hear about another class?');
    suggestionsAfter(conv);

});

app.intent('courses_in_a_subject', (conv, {courseSubject}) => {
    conv.ask('I will get information about ' +
        courseSubject + ' classes.' +
        'Would you like to hear about another class?');
    suggestionsAfter(conv);

});

app.intent('courses_in_a_range', (conv, {courseSubject, cardinal1, cardinal2}) => {
        conv.ask('I will get information about ' +
            courseSubject + ' classes between ' + cardinal1 + ' and '
            + cardinal2 + '. Would you like to hear about another class?');
    suggestionsAfter(conv);
});


// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);

// Handle the Dialogflow NO_INPUT intent.
// Triggered when the user doesn't provide input to the Action
app.intent('actions_intent_NO_INPUT', (conv) => {
    // Use the number of reprompts to vary response
    const repromptCount = parseInt(conv.arguments.get('REPROMPT_COUNT'));
    if (repromptCount === 0) {
        conv.ask('What would you like to hear about?');
    } else if (repromptCount === 1) {
        conv.ask('Please say the name of a class or course number.');
    } else if (conv.arguments.get('IS_FINAL_REPROMPT')) {
        conv.close('Sorry we\'re having trouble. Let\'s ' +
            'try this again later. Goodbye.');
    }
});
