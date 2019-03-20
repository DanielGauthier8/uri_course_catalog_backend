/* eslint-disable max-len */
/* eslint-disable space-before-function-paren */

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

// Import the Dialogflow module and response dependencies
// from the Actions on Google client library.
const {
    dialogflow,
    Permission,
    Suggestions,
    BasicCard,
    Image,
    SimpleResponse,
} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

const request = require('request-promise');

// Instantiate the Dialogflow client
const app = dialogflow({debug: true});

// The Subjects and associated course code
const subjectTable = require('./configure/subject_lookup');

// API keys
const configuration = require('./configure/keys');
const APIKey = configuration.API_key;

const baseURL = 'https://api.uri.edu/v1/catalog/courses/';


/* ###########################Helper Functions######################################## */
const callURIApi = (courseSubject, courseNumber1, courseNumber2) => {
    const options = {
        method: 'GET',
        headers: {
            id: APIKey,
        },
        json: true,
        url: baseURL + courseSubject + '/' + courseNumber1 + '/' + courseNumber2,
    };
    return new Promise((resolve) => {
        let theResolution = [];
        request(options, function (err, response, body) {
            // Request was successful, use the response object at will
            if (!err && response.statusCode === 200) {
                const numResponse = body.length;
                if (numResponse >= 1) {
                    for (let i = 0; i < numResponse; i++) {
                        const theResponse = JSON.parse(JSON.stringify(body[i]));
                        theResolution.push(theResponse);
                    }
                }
            } else {
                console.log(`Error calling the URI API: ${err}`);
            }
            /* if (response.statusCode !== null) {
                console.log(JSON.stringify(body));
            }*/
            resolve(theResolution);
        });
    });
};

const cleanResponse = function (theDescr) {
    theDescr = theDescr.substring(theDescr.indexOf(')') + 1, theDescr.length);
    theDescr = theDescr.replace(/lec. /gi, 'Lecture. ');
    theDescr = theDescr.replace(/ crs./gi, ' Credits');
    theDescr = theDescr.replace(/pre:/gi, ' Prerequisites:');
    theDescr = theDescr.replace(/c-/gi, 'C minus');

    return theDescr;
};

const suggestionsAfter = function (conversation) {
    conversation.ask(new Suggestions('specific course', 'courses within a range', 'no thanks'));
};

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
        if (name.includes(' ') >= 1) {
            const callName = name.substring(0, name.indexOf(' '));
            conversation.ask('<speak>' + 'Hi again ' + callName + ', What do you want to look up?' + '</speak>');
        } else {
            conversation.ask(new SimpleResponse({
                speech: '<speak>' + 'Welcome Back ' + name + ', What do you want to look up?' + '</speak>',
                text: 'Welcome Back ' + name + '! I am looking forward to assisting you today with your quest of finding course information.',
            }));
        }
        suggestionsAfter(conversation);
    }
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conversation, params, permissionGranted) => {
    if (!permissionGranted) {
        // If the user denied our request, go ahead with the conversation.
        conversation.ask('<speak>' + 'Ok, no worries, what do you want to look up?' + '</speak>');
        suggestionsAfter(conversation);
    } else {
        // If the user accepted our request, store their name in
        // the 'conversation.user.storage' object for the duration of the conversation.
        conversation.user.storage.userName = conversation.user.name.display;
        conversation.ask('<speak>' + 'Thanks, ' + conversation.user.storage.userName + '. What do you' +
            ' want to look up?' + '</speak>');
        suggestionsAfter(conversation);
    }
});


app.intent('course_specific', (conversation, {courseSubject, courseNumber1}) => {
    // Call the API
    if (courseNumber1 >= 0) {
        return callURIApi(subjectTable[courseSubject], courseNumber1, '').then((outputText) => {
            if (outputText.length === 0) {
                conversation.ask('<speak>' + 'You are trying to find something the university is not teaching. It appears that the ' +
                    'class you are trying to find does not exist. Please try again.' + '</speak>');
            } else {
                if (!conversation.screen) {
                    conversation.ask('<speak>' + 'Now getting information about ' + outputText[0].Long_Title + '. <break time="2" /> ' + 'The course is about' +
                        cleanResponse(otuputText[0].Descr) + ' The class is at least ' + outputText[0].Min_Units + ' credits.</speak>');
                    if (outputText.length > 1) {
                        conversation.ask('<speak>' + 'There is also ' + outputText[1].Long_Title + ' under the same course code. This class is about' +
                            outputText[1] + '</speak>');
                    }
                } else {
                    conversation.ask('Here you go.' + cleanResponse(outputText[0].Descr) + ' The class is at least ' + outputText[0].Min_Units + ' credits.'/* , new BasicCard({
                    text: 'outputText[0].Descr',
                    title: 'outputText[0].Long_Title',
                    image: new Image({
                        url: 'https://farm2.staticflickr.com/1783/28368046617_efef15cc1b_z.jpg',
                        alt: 'URI Picture',
                    }),
                })*/);
                }
            }
            conversation.ask(new Suggestions('specific course'
                , 'courses within a range', 'no thanks'));
        });
    } else {
        conversation.ask('Course numbers should not be a negative number.  Please try again.');
    }
});


app.intent('courses_in_a_range', (conversation, {courseSubject, courseNumber1, courseNumber2}) => {
    if (courseNumber1 >= 0 && courseNumber2 >= 0) {
        if (courseNumber2 < courseNumber1) {
            const temp = courseNumber2;
            courseNumber2 = courseNumber1;
            courseNumber1 = temp;
        }
        // Call the API
        return callURIApi(subjectTable[courseSubject], courseNumber1, courseNumber2).then((outputText) => {
                conversation.ask('<speak>' + 'Now getting information about ' + courseSubject + ' classes between ' + courseNumber1 + ' and ' + courseNumber2 + '. <break time="2" /> </speak>');
                let listOfClasses = ' I will say the name of the course and then the course code.  Remember the course code if you want to look up more information on the class. ';
                for (let i = 0; i < 5 && i < outputText.length; i++) {
                    listOfClasses = listOfClasses + outputText[i].Long_Title + '<break time="500ms"/>: Course code is ' + outputText[i].FormalDesc + ' ' + outputText[i].Catalog + '. <break time="1" />';
                }
                conversation.ask('<speak>' + listOfClasses + '</speak>');
            }
        );
    } else {
        conversation.ask(new SimpleResponse({
            speech: 'It appears the number you gave was negative.  Please retry.',
            text: 'Course numbers should not be a negative number.  Please retry\'',
        }));
    }
});

// Handle the Dialogflow NO_INPUT intent.
// Triggered when the user doesn't provide input to the Action
app.intent('actions_intent_NO_INPUT', (conversation) => {
    const repromptCount = parseInt(conversation.arguments.get('REPROMPT_COUNT'));
    if (repromptCount === 0) {
        conversation.ask('<speak>' + 'What would you like to hear about?' + '</speak>');
    } else if (repromptCount === 1) {
        conversation.ask('<speak>' + 'Please say the name of a class or course number.' + '</speak>');
    } else if (conversation.arguments.get('IS_FINAL_REPROMPT')) {
        conversation.close('<speak>' + 'Sorry we\'re having trouble. Let\'s ' +
            'try this again later. Goodbye.' + '</speak>');
    }
});

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
