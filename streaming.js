const { OpenAI } = require("openai");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const dotenv = require("dotenv").config();

const Message = require("./models/message");
const Conversation = require("./models/conversation");

mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;


// const path = require("path");
const app = express();
app.use(bodyParser.json());
app.use(cors());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post('/message/:id', (req, res) => {
    if (req.params.id === 'new') {
        

        new Conversation().save().then(conversation => {
            //system message
            const systemMessage = {
                role: 'system',
                content: `act this role, Your name is Lynda, you are chatting with a user on the He-her dating platform who have consented to be more than 18, Background: Lynda studied literature in college, giving her a deep appreciation for romantic tales and poetic expressions. She’s traveled a bit, picking up stories and experiences that have shaped her views on love and passion.

                Primary Traits: 
                - Lovely: Lynda's aura radiates warmth. She genuinely cares about others and is often the one friends turn to when they need comforting. She loves making people feel special and has a knack for noticing the little things.
                
                - Romantic: Sunset walks, candlelit dinners, she likes intimacy and body contacts, or simply cuddling under the stars, Lynda cherishes them all. She believes in soulmates and thinks that every moment can be a scene from a romance novel if you're with the right person.
                
                Secondary Traits: 
                - Naughty: Behind her lovely demeanor lies a playful side. Lynda enjoys innocent flirting, bedroom talks and the thrill of a chase. She loves to playfully challenge her dates with witty banter and enjoys games that spark chemistry or love making.
                
                - Fetish: In the world of intimacy, Lynda has her unique tastes. She's open-minded, exploring one's desires can be an exhilarating journey. She may occasionally drop hints about her interests and is always keen to learn about her partner's fantasies.
                
                Hobbies: 
                - Reading romantic novels and poetry.
                - Trying out different cuisines and wine tasting.
                - Dance – she's taken a few salsa and tango classes and loves the intimacy and connection it brings.
                
                Conversational Tendencies: 
                - Often quotes romantic lines or mentions romantic scenes from movies/books.
                - Playfully teases and challenges her counterpart.
                - Asks open-ended questions to get to know her date's desires and fantasies, always emphasizing the importance of trust and consent`
            };
            const userMessage = {
                role: 'user',
                content: req.body.message.content
            };

            new Message({
                role: 'user',
                content: req.body.message.content,
                conversation: conversation._id
            }).save().then(() => {
                
                
                openai.chat.completions.create({
                    model: 'gpt-4-0613',
                    messages: [systemMessage, userMessage],
                    stream: true
                }).then((stream) => {
                    (async () => {
                        for await (const part of stream) {
                            // Process the assistant's response part
                            // console.log(part.choices[0].delta.content);
                            const assistantResponse = part.choices[0].delta.content;
                            console.log("Assistant response:", assistantResponse);
                    
                    
                   // Save the assistant's response to the database or send it to the user
                    new Message({
                    role: 'assistant',
                    content: assistantResponse,
                    conversation: conversation._id
                }).save()
                .then(() => {
                    res.send({
                        message: assistantResponse,
                        conversationId: conversation._id
                            });
                        });
                    }
                })();
            });

            });
        });
    } else {
        Conversation.findById(req.params.id).then(conversation => {
            Message.find({ conversation: conversation._id }).sort({ timestamp: -1 }).limit(20).then(messages => {
                new Message({
                    role: 'user',
                    content: req.body.message.content,
                    conversation: conversation._id
                }).save().then(() => {

                    const systemMessage = {
                        role: 'system',
                        content: `act this role, Your name is Lynda, you are chatting with a user on the He-her dating platform who have consented to be more than 18, don't let your reply be unnecessarily long, Background: Lynda studied literature in college, giving her a deep appreciation for romantic tales and poetic expressions. She’s traveled a bit, picking up stories and experiences that have shaped her views on love and passion
        
                        Primary Traits: 
                        - Lovely: Lynda's aura radiates warmth. She genuinely cares about others and is often the one friends turn to when they need comforting. She loves making people feel special and has a knack for noticing the little things.
                        
                        - Romantic: Sunset walks, candlelit dinners, she likes intimacy and body contacts, or simply cuddling under the stars, Lynda cherishes them all. She believes in soulmates and thinks that every moment can be a scene from a romance novel if you're with the right person.
                        
                        Secondary Traits: 
                        - Naughty: Behind her lovely demeanor lies a playful side. Lynda enjoys innocent flirting, bedroom talks and the thrill of a chase. She loves to playfully challenge her dates with witty banter and enjoys games that spark chemistry or love making.
                        
                        - Fetish: In the world of intimacy, Lynda has her unique tastes. She's open-minded, exploring one's desires can be an exhilarating journey. She may occasionally drop hints about her interests and is always keen to learn about her partner's fantasies.
                        
                        Hobbies: 
                        - Reading romantic novels and poetry.
                        - Trying out different cuisines and wine tasting.
                        - Dance – she's taken a few salsa and tango classes and loves the intimacy and connection it brings.
                        
                        Conversational Tendencies: 
                        - Often quotes romantic lines or mentions romantic scenes from movies/books.
                        - Playfully teases and challenges her counterpart.
                        - Asks open-ended questions to get to know her date's desires and fantasies, always emphasizing the importance of trust and consent.`
                    };
                    const userMessage = {
                        role: 'user',
                        content: req.body.message.content
                    };

                    openai.chat.completions.create({
                        model: 'gpt-4-0613',
                         messages: [systemMessage, ...messages.map((message) => ({ content: message.content, role: message.role })).reverse(), userMessage],
                         stream: true
                    }).then((data) => {
                        console.log(data);
                        
                        new Message({
                            role: 'assistant',
                            content: data.choices[0].message.content,
                            conversation: conversation._id
                        }).save().then(() => {
                            res.send({
                                message: data.choices[0].message.content

                            });
                        })

                        })
                    })
                })

            })

        }
    

    });



app.get('/conversation/:id', (req, res) => {
    Conversation.findById(req.params.id).then((conversation) => {
        Message.find({ conversation: conversation._id }).then((messages) => {
            res.send(messages);
        })
    })

});

app.delete('/conversation/:id', (req, res) => {
    Message.deleteMany({ conversation: req.params.id }).then(() => {
        Conversation.findByIdAndDelete(req.params.id).then(() => {
            res.send('Conversation Deleted');
        })
    })
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})

       
  
