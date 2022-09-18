import React, { useState, useEffect, useRef } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Image from 'react-bootstrap/Image';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from './logo.svg';
import './App.css';
import { sendChatMessage, sendForgersFinished, sendGetPaintingRequest, sendGuess, sendLikeForgery, sendPromptRequest, sendUnlikeForgery } from './api.js'

import forgerBackground from "./resources/forgers-background.png";
import detectiveBackground from "./resources/detectives-background.png";
import "./resources/IndieFlower-Regular.ttf"
import cryGif from "./resources/cry.gif"
import cheerGif from "./resources/cheer.gif"
import clipboard from "./resources/clipboard.png"
import clipboard2 from "./resources/clipboard2.png"
import detectiveFigure from "./resources/detective.png"

import ImageMagnifier from "./zoom.js";

function App() {
    const [varThatNeedHooks, setVar] = useState({});
    const [serverMessage, setServerMessage] = useState("");
    const [username, setUsername] = useState("")
    // The text that the user has currently entered in the chat box field
    const [chatForm, setChatForm] = useState("");
    // The text put in the prompt form
    const [promptForm, setPromptForm] = useState("");
    const [webSocketReady, setWebSocketReady] = useState(false);

    // base64 string representing the true painting
    const [sourceImage, setSourceImage] = useState("")

    // an array of {image_base64, prompt, likes, sender, has_liked}
    const [generatedImages, setGeneratedImages] = useState([])
    // the generated image at the center of the screen
    const [centerImage, setCenterImage] = useState("")

    // string representing the artist info
    const [artistInfo, setArtistInfo] = useState("")
    const [artistName, setArtistName] = useState("")
    const [styleInfo, setStyleInfo] = useState("")
    const [styleName, setStyleName] = useState("")
    const [artistStyleInfo, setArtistStyleInfo] = useState("")
    const [artistOtherPaintings, setArtistOtherPaintings] = useState([])

    const [detectiveChoose, setDetectiveChoose] = useState(false)
    const [forgersBestPaintings, setForgersBestPaintings] = useState([])

    const [webSocket, setWebSocket] = useState(new WebSocket("ws://127.0.0.1:8080/ws"));

    // For handling the info modal
    const [showArtistInfo, setShowArtistInfo] = useState(false);
    const handleCloseArtistInfo = () => setShowArtistInfo(false);
    const handleShowArtistInfo = () => setShowArtistInfo(true);

    // For handling the style info modal
    const [showStyleInfo, setShowStyleInfo] = useState(false);
    const handleCloseStyleInfo = () => setShowStyleInfo(false);
    const handleShowStyleInfo = () => setShowStyleInfo(true);

    // For handling endgame info
    const [showEndGameInfo, setShowEndGameInfo] = useState(false);
    const handleCloseEndGameInfo = () => setShowEndGameInfo(false);
    const handleShowEndGameInfo = () => setShowEndGameInfo(true);

    const divRef = useRef(null);

    const [click, setClick] = useState(false)
    const handleClick = () => setClick(!click)

    const [detectiveGuess, setDetectiveGuess] = useState("");

    // Whether the player is a detective or forger
    const [isForger, setIsForger] = useState(true)

    const [winnerInfo, setWinnerInfo] = useState("");

    const handleLikePainting = (painting_id) => {
        // Set that user liked the painting
        var isLike = true;
        const newGeneratedImages = generatedImages.map((item) => {
            const liked = !item.liked
            if (item.id == painting_id) {
                isLike = liked;
                return { ...item, liked };
            } else {
                return item;
            }
        })
        setGeneratedImages(
            newGeneratedImages
        );
        console.log("got new images", newGeneratedImages)
        // Ask backend to update the like count
        if (isLike) {
            sendLikeForgery(
                webSocket,
                painting_id,
                username
            )
        } else {
            sendUnlikeForgery(
                webSocket,
                painting_id,
                username
            )
        }

    }

    const handleLikeCounter = (forgery_id, new_likes) => {
        // const newGeneratedImages = 
        //   generatedImages.map((item) => {
        //     if (item.id == forgery_id) {
        //       const likes = new_likes
        //       return { ...item, likes: new_likes };
        //     } else {
        //       return item;
        //     }
        //   })
        // console.log("hande likes", generatedImages)
        // setGeneratedImages(
        //     newGeneratedImages
        // );
        // console.log("hande likes", newGeneratedImages)
    }

    const handleImage = () => {
        return (detectiveChoose || !isForger) ? detectiveBackground : forgerBackground
    }

    const handleWinner = () => {
        return winnerInfo == "Detectives" ?
            "You FOUND the genuine work!" :
            "You FOOLED the detectives!"
    }

    const handleWinnerMeme = () => {
        return winnerInfo == "Detectives" ? cheerGif : cryGif
    }


    useEffect(() => {
        webSocket.onopen = (event) => {
            console.log("Sending user connect")
            webSocket.send(JSON.stringify({
                event_type: "USER_CONNECT"
            }));
            setWebSocketReady(true);
        };

        webSocket.onmessage = function (data) {
            const message = JSON.parse(data.data)
            console.log("Got message", message)
            switch (message.event_type) {
                case "USER_CONNECT":
                    console.log("User handshake event", message)
                    setUsername(message.data.username)
                    setIsForger(message.data.isForger)
                    break;

                case "RECEIVE_GENERATION_RESULT":
                    // Add that the user did not like the new painting
                    message.data['liked'] = false
                    setGeneratedImages(prevGeneratedImages => [...prevGeneratedImages, message.data])
                    setCenterImage("data:image/png;base64," + message.data.image_bytes)
                    console.log("received generation result, now ", generatedImages)
                    break;
                case "RECEIVE_WIKIPEDIA_RESULT":
                    setSourceImage(message.data['image_b64_str'])
                    setArtistInfo(message.data['artist_summary'])
                    setArtistName(message.data['artist'])
                    setStyleInfo(message.data['style_summary'])
                    setStyleName(message.data['style'])
                    setArtistStyleInfo(message.data['artist_style_summary'])
                    setArtistOtherPaintings(message.data['other_paintings'])
                    break;

                case "RECEIVE_LIKE":
                    handleLikeCounter(message.data['forgery_id'], message.data['likes'])
                    break;
                case "RECEIVE_CHAT_MESSAGE":
                    divRef.current.scrollIntoView({ behavior: 'smooth' });
                    break;

                case "RECEIVE_FORGERS_FINISHED":
                    setDetectiveChoose(true)
                    console.log("got image bytes", sourceImage)
                    const array = message.data['best_paintings']

                    setForgersBestPaintings(array)
                    break;

                case "RECEIVE_DETECTIVES_FINISHED":
                    // alert(message.message.data.winner);
                    setWinnerInfo(message.data.winner)
                    handleShowEndGameInfo()
            }
            // If the message contains a chat message, append
            if (message.message.data != "") {
                setServerMessage(prevMessage => prevMessage + "\n" + message.message.sender + ": " + message.message.data);
            }
        };

        webSocket.onclose = function (event) {
            setWebSocketReady(false);
            setTimeout(() => {
                setWebSocket(new WebSocket("ws://127.0.0.1:8080/ws"));
            }, 1000);
        };

        webSocket.onerror = function (err) {
            console.log('Socket encountered error: ', err.message, 'Closing socket');
            setWebSocketReady(false);
            webSocket.close();
        };

        return () => {
            webSocket.close();
        };
    }, [webSocket]);

    if (!webSocketReady) {
        return <h1>Connecting to server...</h1>;
    } else if (serverMessage == "") {
        return <h1>Waiting for message from server ...</h1>;
    } else {
        return (

            <div style={{ backgroundImage: `url(${handleImage()})`, backgroundSize: "50%" }}>
                {/* Detective view */}
                {!detectiveChoose && !isForger &&
                    <Container fluid={true}>
                        <Row style={{ backgroundColor: "rgba(186, 209, 227, .85)", width: "100vw", height: "6vh" }}>
                            <Col sm={2}>
                                <p style={{ marginTop: "2px", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }}>Detective</p>
                            </Col>
                            <Col sm={8}>
                                <p style={{ marginTop: "2px", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }} className="d-flex justify-content-center"></p>
                            </Col>
                            <Col sm={2}>
                                <Button style={{ float: "right", backgroundColor: "#06508a", border: "#78320a", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px" }} className="d-flex justify-content-end" onClick={() => {
                                    setGeneratedImages([])
                                    setCenterImage("")
                                    sendGetPaintingRequest(webSocket, username); setDetectiveChoose(false);

                                }}>New round</Button>
                                <Button style={{ float: "right", marginRight:"2px", backgroundColor: "#78320a", border: "#78320a", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px" }} className="d-flex justify-content-end" onClick={() => {
                                    setIsForger(true)
                                }}>Forger</Button>

                                {/* <Button style={{ float: "right", backgroundColor: "#a85c19", border: "#a85c19", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px", marginRight: "3px" }} className="d-flex justify-content-end" onClick={() => { sendForgersFinished(webSocket) }}>Done!</Button> */}
                            </Col>
                        </Row>
                        <Row style={{ width: "100vw", height: "93vh" }}>
                            <Col sm={2}>
                                <label style={{ fontSize: "300%", fontFamily: "IndieFlower", fontWeight: "bolder", marginTop:"10px" }} className="d-flex flex-row-reverse">While you wait, some Info about...</label>
                            </Col>
                            <Col sm={8} style={{backgroundImage: `url(${clipboard})`, backgroundSize: "auto 100%", backgroundRepeat: "no-repeat", height: "100%" }} >
                                <Row style={{ height: "100%" }}>
                                    <Col sm={3} style={{}}></Col>
                                    <Col sm={6} style={{}}>
                                        {/* <Row style={{height:"20vh"}}></Row>
                                        <Row style={{height:"53vh", maxHeight:"53vh"}}>
                                        <h1>About the artist: {artistName}</h1>
                                        {artistInfo}
                                        <h1>About the art movement: {styleName} </h1>
                                                    {styleInfo}

                                        </Row>
                                        <Row style={{height:"20vh"}}></Row> */}
                                        <Row style={{height:"18vh"}}></Row>
                                        <Row style={{ overflowY: "auto", position: "relative", height:"57vh"}}>
                                            <Col style={{maxHeight:"80%"}}>
                                                
                                                <Row>
                                                    <h1>About the artist: {artistName}</h1>
                                                    {artistInfo}
                                                </Row>

                                                <Row>
                                                    <h1>About the art movement: {styleName} </h1>
                                                    {styleInfo}
                                                </Row>


                                                <Row  className="d-flex justify-content-evenly align-items-center">
                                                    <h1>Artist's Works</h1>
                                                    {
                                                        artistOtherPaintings.map((generatedImage) => (
                                                            // <Card style={{ width: "19%", height: "19vw" }}>
                                                            //     <Card.Body>
                                                            //         <Card.Img style={{ marginBottom: "0px" }} className="hover-zoom" src={generatedImage.image_b64_str} />
                                                            //     </Card.Body>
                                                            // </Card>
                                                            <img src={generatedImage.image_b64_str} />
                                                        ))
                                                    }
                                                </Row> 
                                            </Col> 
                                        </Row> 
                                        <Row style={{height:"14vh"}}></Row>
                                    </Col>
                                    <Col sm={3} style={{}}></Col>
                                </Row>
                            </Col>

                            <Col sm={2} style={{overflow:"hidden"}}>
                                <Row style={{height:"60vh"}}></Row>
                                <Row style={{overflow:"hidden"}}>
                                <img style={{overflow:"hidden", height:"200px", width:"150px", float:"inline-end"}} src={detectiveFigure} class="d-flex align-items-end" />
                                </Row>
                            </Col>
                        </Row>
                    </Container>
                }
                {/* Forger view */}
                {!detectiveChoose && isForger &&
                    <Container fluid={true}>
                        <Row style={{ backgroundColor: "rgba(232, 216, 197, .9)", height: "6vh", width: "100vw" }}>
                            <Col sm={3}>
                                <p style={{ marginTop: "2px", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }}>Forger</p>
                            </Col>
                            <Col sm={6}>
                                <p style={{ marginTop: "2px", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }} className="d-flex justify-content-center"></p>
                            </Col>
                            <Col sm={3}>
                                <Button style={{ float: "right", backgroundColor: "#78320a", border: "#78320a", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px" }} className="d-flex justify-content-end" onClick={() => {
                                    sendGetPaintingRequest(webSocket, username)
                                    setGeneratedImages([])
                                    setCenterImage("")
                                }}>New round</Button>
                                <Button style={{ float: "right", backgroundColor: "#a85c19", border: "#a85c19", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px" }} className="d-flex justify-content-end" onClick={() => { sendForgersFinished(webSocket) }}>Done!</Button>
                                <Button style={{ float: "right", backgroundColor: "#06508a", border: "#78320a", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px", marginRight: "3px" }} className="d-flex justify-content-end" onClick={() => {
                                    setIsForger(false)
                                }}>Detective</Button>
                            </Col>
                        </Row>
                        <Row style={{ height: "93vh", width: "100vw" }}>
                            <Col sm={4} style={{ backgroundColor: "rgba(250, 233, 212, 0.8)", height: "100%" }}>
                                <label style={{ fontSize: "200%", fontFamily: "IndieFlower", fontWeight: "bolder", }} className="d-flex justify-content-center">Source painting</label>

                                {/* source pic */}
                                <div className="d-flex justify-content-center">
                                    <ImageMagnifier
                                        src={sourceImage}
                                    />
                                </div>

                                <label style={{ fontSize: "200%", fontFamily: "IndieFlower", fontWeight: "bolder" }}>Forgers' Gallery</label>
                                <div style={{ width: "100%", height: "45%", overflowY: "auto", position: "relative" }} className="flex-container wrap">

                                    {/* <div style={{ width: "120%", height: "30%" }} className="img-wrapper" className="d-flex justify-content-center" >
                                    <img style={{ maxHeight: "100%", maxWidth: "100%" }} src={sourceImage} alt="" className="hover-zoom" />
                                    </div> */}

                                    {/* Generated image list, Gallery */}
                                    {
                                        generatedImages.map((generatedImage) =>

                                            <Card style={{ width: "33%", height: "14vw" }}>
                                                <Card.Img style={{ border: "1px solid #555" }} src={"data:image/png;base64," + generatedImage.image_bytes} className="hover-zoom2" />
                                                <Card.Body>
                                                    <Card.Title style={{ fontSize: "70%", height: "3px" }}>
                                                        {generatedImage.prompt}
                                                        {" "}
                                                        {generatedImage.liked ?
                                                            <AiFillHeart style={{color: "#ff2160"}} onClick={() => { handleLikePainting(generatedImage.id) }} />
                                                            : <AiOutlineHeart style={{color: "#ff2160"}} onClick={() => { handleLikePainting(generatedImage.id) }} />}
                                                    </Card.Title>
                                                    {/* <Card.Text style={{ fontSize: "100%", color: "#ff2160" }}>
                                                        {/* {generatedImage.likes} */}
                                                    {/* </Card.Text> */} 
                                                    {/* <Card.Text>
                                                        {generatedImage.sender}'s forgery
                                                    </Card.Text> */}

                                                    {/* <Button ><AiOutlineHeart /></Button> */}
                                                </Card.Body>
                                            </Card>
                                        )
                                    }
                                </div>

                                {/* Show artist info modal */}
                                <Button className="d-flex align-items-end" style={{ marginTop: "3px", height: "5%", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "150%", backgroundColor: "transparent", color: "#78320a", border: "#78320a" }} onClick={handleShowArtistInfo}>
                                    Learn about {artistName} ...
                                </Button>
                                <Button className="d-flex align-items-end" style={{ height: "5%", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "150%", backgroundColor: "transparent", color: "#78320a", border: "#78320a" }} onClick={handleShowStyleInfo}>
                                    Learn about {styleName} ...
                                </Button>
                            </Col>

                            <Col style={{ height: "100%", marginTop: "3px" }} sm={6} className="text-center">
                                {/* image placeholder */}
                                <Row style={{ width: "100%", height: "60%" }}>
                                    <Col style={{ width: "100%", height: "100%" }} >
                                        <img style={{ maxHeight: "100%", maxWidth: "100%" }} src={centerImage} />
                                    </Col>
                                </Row>

                                <Row style={{ maxHeight: "30%" }}>
                                    {/* input prompt */}
                                    <InputGroup style={{ marginTop: "2%" }} className="mb-3">
                                        <Form.Control
                                            placeholder="Enter your prompt here..."
                                            aria-label="Prompt"
                                            aria-describedby="basic-addon1"
                                            value={promptForm}
                                            onChange={(event) => { setPromptForm(event.target.value) }}
                                        />

                                    </InputGroup>

                                    <div>
                                        <Button style={{ width: "30%", backgroundColor: "#78320a", border: "#78320a", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }} type="submit" onClick={() => {
                                            sendPromptRequest(webSocket, promptForm, username)
                                            setPromptForm("");
                                        }}> Generate forgery!</Button>
                                    </div>
                                </Row>
                            </Col>

                            <Col sm={2} style={{ height: "100%", bottom: 0, position: "relative" }}>
                                {/* Chat box */}
                                {/* check out how to stick to the bottom tmr */}
                                <Row style={{ backgroundColor: "rgba(250, 233, 212, 0.8)", overflowY: "auto", height: "93%", bottom: 0, position: "relative" }}>

                                    <div>Username: {username}</div>
                                    <div className='display-linebreak'>{serverMessage}</div>

                                    <div ref={divRef} />
                                </Row>
                                <Row style={{ height: "7%" }}>
                                    <InputGroup className="mb-3">
                                        <Form.Control
                                            placeholder="Send a message..."
                                            aria-label="Prompt"
                                            aria-describedby="basic-addon1"
                                            value={chatForm}
                                            onChange={(event) => { setChatForm(event.target.value) }}
                                        />
                                        <Button style={{ justifyContent: 'center', backgroundColor: "#78320a", border: "#78320a", }} type="submit" onClick={() => {
                                            sendChatMessage(webSocket, chatForm, username);
                                            setChatForm("");
                                        }}>Send</Button>
                                    </InputGroup>
                                </Row>
                            </Col>

                        </Row>

                    </Container>
                }
                <Modal show={showArtistInfo}
                    dialogClassName="my-modal"
                    onHide={handleCloseArtistInfo} animation={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>{artistName}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {artistInfo}
                        {artistStyleInfo}
                        {
                            artistOtherPaintings.map((generatedImage) => (
                                <Card.Img style={{ marginBottom: "0px" }} src={generatedImage.image_b64_str} />
                            ))
                        }
                    </Modal.Body>
                    <Modal.Footer>
                        <Button style={{ backgroundColor: "#78320a", border: "#78320a", color: "white", fontFamily: "IndieFlower", fontWeight: "bolder" }} variant="primary" onClick={handleCloseArtistInfo}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>


                <Modal show={showStyleInfo} onHide={handleCloseStyleInfo}
                    dialogClassName="my-modal"
                    animation={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>{styleName}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {styleInfo}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button style={{ backgroundColor: "#78320a", border: "#78320a", color: "white", fontFamily: "IndieFlower", fontWeight: "bolder" }} variant="primary" onClick={handleCloseStyleInfo}>
                            Close
                        </Button>

                    </Modal.Footer>
                </Modal>


                {/* Detective decide view */}
                {detectiveChoose &&
                    <Container fluid={true}>
                        <Row style={{ backgroundColor: "rgba(186, 209, 227, .85)", width: "100vw", height: "6vh" }}>
                            <Col sm={2}>
                                <p style={{ marginTop: "2px", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }}>Detective</p>
                            </Col>
                            <Col sm={8}>
                                <p style={{ marginTop: "2px", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "130%" }} className="d-flex justify-content-center"></p>
                            </Col>
                            <Col sm={2}>
                                <Button style={{ float: "right", backgroundColor: "#06508a", border: "#78320a", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px" }} className="d-flex justify-content-end" onClick={() => {

                                    setGeneratedImages([])
                                    setCenterImage("")
                                    sendGetPaintingRequest(webSocket, username); setDetectiveChoose(false);

                                }}>New round</Button>
                                {/* <Button style={{ float: "right", backgroundColor: "#a85c19", border: "#a85c19", fontFamily: "IndieFlower", fontWeight: "bolder", fontSize: "90%", marginTop: "2px", marginRight: "3px" }} className="d-flex justify-content-end" onClick={() => { sendForgersFinished(webSocket) }}>Done!</Button> */}
                            </Col>
                        </Row>
                        <Row style={{ width: "100vw", height: "10vh" }}>
                            <label style={{ fontSize: "500%", fontFamily: "IndieFlower", fontWeight: "bolder", backgroundColor: "rgba(186, 209, 227, .85)" }} className="d-flex justify-content-center align-items-end">Which is the real one ?</label>
                        </Row>
                        <Row style={{ width: "100vw", height: "83vh" }} className="d-flex justify-content-evenly align-items-center">
                            {
                                forgersBestPaintings.map((generatedImage) => (
                                    <Card style={{ width: "19%", height: "19vw" }}>
                                        <Card.Body>
                                            <Card.Img style={{ marginBottom: "0px" }} className="hover-zoom" onClick={() => { console.log("Selected painting", generatedImage.id); setDetectiveGuess(generatedImage.id); sendGuess(webSocket, username, generatedImage.id); }} src={generatedImage.id == "0" ? generatedImage.image_bytes : "data:image/png;base64," + generatedImage.image_bytes} />
                                        </Card.Body>
                                    </Card>
                                ))
                            }
                        </Row>

                    </Container>
                }

                <Modal show={showEndGameInfo} onHide={handleCloseEndGameInfo} animation={true}>
                    <Modal.Header closeButton>
                        <Modal.Title>{winnerInfo} WIN!</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {handleWinner()}
                    </Modal.Body>
                    <img src={handleWinnerMeme()} />
                    <Modal.Footer>
                        <Button style={{ backgroundColor: "#06508a", border: "#06508a", color: "white", fontFamily: "IndieFlower", fontWeight: "bolder" }} variant="primary" onClick={handleCloseEndGameInfo}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>

            </div>


        )
    }
}

export default App;