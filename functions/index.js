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
    Suggestions,
    BasicCard,
    Button,
    BrowseCarousel,
    BrowseCarouselItem,
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

const pictureArr = ['https://farm2.staticflickr.com/1783/28368046617_efef15cc1b_z.jpg',
    'https://farm4.staticflickr.com/3757/13898523014_da6dce1b5e_z.jpg',
    'https://farm5.staticflickr.com/4845/46287975361_c23995f3a4_z.jpg',
    'https://farm5.staticflickr.com/4902/45564398184_e1a5139a42_z.jpg',
    'https://farm1.staticflickr.com/767/31369620724_208ab67e3d_z.jpg',
    'https://farm1.staticflickr.com/552/32007601851_c63f0afdbb_z.jpg',
    'https://farm1.staticflickr.com/357/31977069912_efb2bf6b90_z.jpg',
    'https://farm9.staticflickr.com/8602/27691258664_e56f584cef_z.jpg',
    'https://farm5.staticflickr.com/4826/45564403964_e7cc441e61_z.jpg',
    'https://farm5.staticflickr.com/4902/46287974851_cd29a71c5a_z.jpg',
    'https://farm5.staticflickr.com/4845/45564406104_9791a84fe8_z.jpg',
    'https://farm5.staticflickr.com/4870/45564411094_09169f1113_z.jpg',
    'https://farm5.staticflickr.com/4831/45564412494_cbe8174e8a_z.jpg'];

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


const cleanText = function (theDescr) {
    theDescr = theDescr.replace(/lec. /gi, 'Lecture: ');
    theDescr = theDescr.replace(/ crs./gi, ' Credits');
    theDescr = theDescr.replace(/pre: /gi, ' Prerequisites: ');
    theDescr = theDescr.replace(/, lab. /gi, ', Lab: : ');
    return theDescr;
};


let fixTitle = function (theTitle) {
    if (theTitle.substring(theTitle.length - 3, theTitle.length) === ' IV') {
        theTitle = theTitle.substring(0, theTitle.length - 3) + ' 4';
    } else if (theTitle.substring(theTitle.length - 4, theTitle.length) === ' III') {
        theTitle = theTitle.substring(0, theTitle.length - 4) + ' 3';
    } else if (theTitle.substring(theTitle.length - 3, theTitle.length) === ' II') {
        theTitle = theTitle.substring(0, theTitle.length - 3) + ' 2';
    } else if (theTitle.substring(theTitle.length - 2, theTitle.length) === ' I') {
        theTitle = theTitle.substring(0, theTitle.length - 2) + ' 1';
    } else if (theTitle.substring(theTitle.length - 2, theTitle.length) === ' V') {
        theTitle = theTitle.substring(0, theTitle.length - 2) + ' 5';
    } else {
        theTitle = theTitle.replace(/ I: /gi, ' 1: ');
        theTitle = theTitle.replace(/ II: /gi, '  2: ');
        theTitle = theTitle.replace(/ III: /gi, '  3: ');
        theTitle = theTitle.replace(/ IV: /gi, '  4: ');
        theTitle = theTitle.replace(/ V: /gi, '  5: ');
        theTitle = theTitle.replace(/ VI: /gi, '  6: ');
        theTitle = theTitle.replace(/ VII: /gi, '  7: ');
    }
    return theTitle;
};

const suggestionsAfter = function (conversation) {
    conversation.ask(new Suggestions('specific course', 'courses within a range', 'courses at a level', 'no thanks'));
};


/* ###########################App Intents######################################## */
app.intent('Default Welcome Intent', (conversation) => {
        conversation.ask(new SimpleResponse({
            speech: '<speak>' + 'Hello and welcome to the University of Rhode Island\'s course catalog!<break time="10ms" /> I am looking forward to assisting you with ' +
                'your quest to find course information. Just say help if you need guidance using the application' +
                '. What can I help you with?</speak>',
            text: 'Hello and welcome to URI Course Catalog!  \nYou can look up things such as courses of a subject in a range, specific courses, and ' +
                'answers to frequently asked questions.  \nWhat can I help you with?',
        }));
        suggestionsAfter(conversation);
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
                    conversation.ask('<speak>' + 'Now getting information about ' + fixTitle(outputText[0].Long_Title) +
                        '. <break time="2" /> ' + 'The course is about' + cleanResponse(outputText[0].Descr) +
                        ' The class is at least ' + outputText[0].Min_Units + ' credits. Can I help you with anything else?</speak>');
                    if (outputText.length > 1) {
                        conversation.ask('<speak>' + 'There is also ' + outputText[1].Long_Title +
                            ' under the same course code. This class is about' + outputText[1] + '.  Others may also exist. Can I help you with anything else? </speak>');
                    }
                } else {
                    if (outputText.length === 1) {
                        conversation.ask('<speak> Here is information about ' + fixTitle(outputText[0].Long_Title) + '. <break time="2"/>Can I help you with anything else? </speak>', new BasicCard({
                            title: outputText[0].Long_Title,
                            text: cleanText(outputText[0].Descr),
                            subtitle: outputText[0].College_Name,
                            image: new Image({
                                url: pictureArr[Math.floor(Math.random() * pictureArr.length)],
                                alt: 'Picture of Kingston Campus',
                            }),
                            buttons: new Button({
                                title: 'eCampus',
                                url: 'https://web.uri.edu/ecampus/student-access/',
                            }),
                        }));
                    } else {
                        if (outputText[1].Catalog.includes('H') >= 1) {
                            conversation.ask('<speak> Here is information about ' + fixTitle(outputText[0].Long_Title) + '. <break time="2"/>Can I help you with anything else? </speak>', new BasicCard({
                                title: outputText[0].Long_Title,
                                text: cleanText(outputText[0].Descr + '  \n  \n **Honors Version:**  \n' + outputText[1].Descr),
                                subtitle: outputText[0].College_Name,
                                image: new Image({
                                    url: pictureArr[Math.floor(Math.random() * pictureArr.length)],
                                    alt: 'Picture of Kingston Campus',
                                }),
                                buttons: new Button({
                                    title: 'eCampus',
                                    url: 'https://web.uri.edu/ecampus/student-access/',
                                }),
                            }));
                        } else {
                            conversation.ask('<speak> Here is information about ' + fixTitle(outputText[0].Long_Title) + '. <break time="2"/>Can I help you with anything else? </speak>', new BasicCard({
                                title: outputText[0].Long_Title,
                                text: cleanText(outputText[0].Descr + '  \n OTHER VERSIONS OF COURSES WITH THIS SAME COURSE CODE EXISTS'),
                                subtitle: outputText[0].College_Name,
                                image: new Image({
                                    url: pictureArr[Math.floor(Math.random() * pictureArr.length)],
                                    alt: 'Picture of Kingston Campus </speak>',
                                }),
                                buttons: new Button({
                                    title: 'eCampus',
                                    url: 'https://web.uri.edu/ecampus/student-access/',
                                }),
                            }));
                        }
                    }
                }
            }
            conversation.ask(new Suggestions('specific course', 'courses within a range', 'no thanks'));
        });
    } else {
        conversation.ask('Course numbers should not be a negative number.  Please try again.');
    }
});


app.intent(['courses_at_a_level', 'courses_in_a_range'], (conversation, {courseSubject, courseNumber1, courseNumber2}) => {
    if (courseNumber2 === undefined || courseNumber2 === null) {
        courseNumber2 = parseInt(courseNumber1) + 100;
    }
    // Flip the min and max search range if max is min and vice versa
    if (courseNumber1 >= 0 && courseNumber2 >= 0) {
        if (courseNumber2 < courseNumber1) {
            const temp = courseNumber2;
            courseNumber2 = courseNumber1;
            courseNumber1 = temp;
        }
        // Keep course codes under 1000
        if (courseNumber2 >= 1000) {
            courseNumber2 = 999;
        }
        // Call the API
        return callURIApi(subjectTable[courseSubject], courseNumber1, courseNumber2).then((outputText) => {
            if (outputText.length !== 0) {
                if (!conversation.screen) {
                    conversation.ask('<speak>' + 'Now getting information about ' + outputText[0].FormalDesc + ' classes between ' + courseNumber1 + ' and ' + courseNumber2 + '. <break time="2" /> </speak>');
                    let listOfClasses = ' I will say the name of the course and then the course code.  Remember the course code if you want to look up more information on the class. ';
                    if (outputText.length > 5) {
                        listOfClasses = listOfClasses + 'It appears there are ' + outputText.length + ' results for this query.  I will start by saying the first five courses for this search. They are as follows. ';
                    }
                    for (let i = 0; i < 5 && i < outputText.length; i++) {
                        listOfClasses = listOfClasses + fixTitle(outputText[i].Long_Title) + '<break time="500ms"/>: Course code is ' + outputText[i].Subject + ' ' + outputText[i].Catalog + '. <break time="1" />';
                    }
                    if (outputText.length > 5) {
                        listOfClasses = listOfClasses + 'If you want to hear the next five classes just say. Get me ' +
                            outputText[0].FormalDesc + ' classes from ' + outputText[5].Catalog + ' to ' + courseNumber2 + '.';
                    }
                    listOfClasses = listOfClasses + '<break time="2"/> Is there anything else I help you with?';
                    conversation.ask('<speak>' + listOfClasses + '</speak>');
                } else {
                    conversation.ask('<speak>' + 'Now getting information about ' + outputText[0].FormalDesc + ' classes between ' + courseNumber1 + ' and ' + courseNumber2 + '. ' + ' </speak>');
                    let listOfClasses = '';
                    for (let i = 0; i < outputText.length; i++) {
                        listOfClasses = listOfClasses + '**' + outputText[i].Long_Title + '**: ' + outputText[i].Subject + ' ' + outputText[i].Catalog + '  \n  \n';
                    }
                    conversation.ask(' Here you go. Can I help you with anything else?', new BasicCard({
                        title: outputText[0].FormalDesc + ': ' + courseNumber1 + '-' + courseNumber2,
                        text: listOfClasses,
                        subtitle: outputText[0].College_Name,
                        image: new Image({
                            url: pictureArr[Math.floor(Math.random() * pictureArr.length)],
                            alt: 'Picture of Kingston Campus',
                        }),
                        buttons: new Button({
                            title: 'eCampus',
                            url: 'https://web.uri.edu/ecampus/student-access/',
                        }),
                    }));
                }
            } else {
                conversation.ask(new SimpleResponse({
                    speech: '<speak>No courses were found in this range.  Please try again.</speak>',
                    text: 'No courses were found in this range.  Please try again\'',
                }));
            }
        });
    } else {
        conversation.ask(new SimpleResponse({
            speech: '<speak>It appears the number you gave was negative.  Please retry.</speak>',
            text: 'Course numbers should not be a negative number.  Please retry\'',
        }));
    }
});

app.intent(['course_specific-no', 'courses_at_a_level-no', 'courses_in_a_range-no'], (conversation) => {
    conversation.close('Let me know when you want to talk about classes again!');
});

app.intent('sources', (conversation) => {
    conversation.ask(new SimpleResponse({
        speech: '<speak>' + 'I get all of my course information from the  ' +
            '<say-as interpret-as="characters">URI</say-as> eCampus  <say-as interpret-as="characters">API</say-as> ' +
            'found at  <say-as interpret-as="characters">API</say-as> dot  <say-as interpret-as="characters">URI</say-as> dot ' +
            ' <say-as interpret-as="characters">EDU</say-as>.  I get my pictures from  <say-as interpret-' +
            'as="characters">URI</say-as>\'s public flickr account, and I answer  <say-as interpret-as=' +
            '"characters">FAQ</say-as> based of of many live  <say-as interpret-as="characters">FAQ</say-as> ' +
            'pages on the  <say-as interpret-as="characters">URI</say-as> website.' + '</speak>',
        text: 'I get all of my course information from the URI eCampus API found at api.uri.edu.  I get my pictures' +
            ' from URI\'s public flickr account, and I answer FAQ based of of many live pages on the URI website.',
    }));
    if (conversation.screen) {
        conversation.ask(new BrowseCarousel({
            items: [
                new BrowseCarouselItem({
                    title: 'Images Source',
                    url: 'https://www.flickr.com/photos/universityofrhodeisland/albums/72157644059272895/with/31284649924/',
                    description: 'URI\'s public flickr account',
                }),
                new BrowseCarouselItem({
                    title: 'Course Information',
                    url: 'https://api.uri.edu/#/',
                    description: 'The eCampus API',
                }),
                new BrowseCarouselItem({
                    title: 'Project Advisor',
                    url: 'https://www.linkedin.com/in/david-brown-b3946a10/',
                    description: 'URI Lecturer David Brown',
                }),
                new BrowseCarouselItem({
                    title: 'Developer',
                    url: 'https://linkedin.com/in/daniel-gauthier/',
                    description: 'Daniel Gauthier',
                }),
                new BrowseCarouselItem({
                    title: 'FAQ Information',
                    url: 'https://www.web.uri.edu/',
                    description: 'URI\'s main website',
                }),
            ],
        }));
    }
});

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
