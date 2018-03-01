import express from 'express';
const app = express()
import stream from 'stream'; // ES6 synthax to import node stream
import fs from 'fs'; // File System module
import es from 'event-stream'; // Event Stream module

// let dataCities = fs.readFileSync('./data/cities_canada-usa.tsv', 'utf-8')

const scoreCityByName = (currentCity, citySearched) => { 
    // console.log('city Searched : \n', citySearched);
    // console.log('current City : \n', currentCity);
    if(currentCity.name && citySearched.name){
    let similarityName = 0;
    let similarityAltName = false;
    let length = Math.min(citySearched.name.length, currentCity.name.length);
    
    for(let i= 0; i<currentCity.alternateNames.length; i++){
        if(citySearched.name.toLowerCase() === currentCity.alternateNames[i].toLowerCase()){
            similarityAltName = true; 
        }
    }
    if(!similarityAltName){
    for(let i = 0; i < length; i++){
        if(citySearched.name[i].toLowerCase() === currentCity.name[i].toLowerCase()){
            similarityName += 1;
        }
    }

    if( !(similarityName>0)  && citySearched.name.length < currentCity.name.length){
        // console.log('wa got here')
        if(currentCity.name.includes(citySearched.name)){
            // console.log(currentCity);            
            similarityName = citySearched.name.length
        } 
    } 
    }

    
    similarityAltName?currentCity.score = 1: currentCity.score = similarityName/currentCity.name.length;
    }
    
}

const getAlternateNames = (altnamesString) => {
   return altnamesString? altnamesString.split(',') : []
} 

const scoreCityByLatLong = (currentCity, citySearched) => {
    let latDif = Math.abs(currentCity.latitude) - Math.abs(citySearched.latitude); 
    let longDif = Math.abs(currentCity.longitude) - Math.abs(citySearched.longitude);
    if(latDif < 2 && longDif < 2){
        currentCity.score = (currentCity.score + Math.abs((((latDif+longDif)/2)-2)/2))/2;
     
    }
    
}

app.get('/suggestions', (request, response)=> {
    let citySuggestions = [];
    let citySuggestionsReadyToGo =  [];
    const citySearched = {
        name : request.query.q, 
        latitude: request.query.latitude,
        longitude: request.query.longitude
    }
    let first = true;
 
    if(request.query.q || (request.query.longitude && request.query.latitude)){

        let readStream = fs.createReadStream('./data/cities_canada-usa.tsv') // Reads from file in chunks of 64 kb
                            .pipe(es.split('\n')) // Split Strings at new line
                            .pipe(es.mapSync((data) => { 
                                // console.log(data.split('\t'));
                                return data.split('\t') // Synchronously split Strings to arrays at tab character
                            }))
        
        readStream.on('data', (chunk) => {
            if(first){
                first = false;
                return
            }
            let currentCity = {
                name: chunk[1],
                latitude: chunk[4],
                longitude: chunk[5],
                score: 0,
                alternateNames: getAlternateNames(chunk[3])
            }
            if(request.query.q){
            scoreCityByName(currentCity, citySearched);
            }
            if(request.query.longitude && request.query.latitude) {
            scoreCityByLatLong(currentCity, citySearched);
            }
            
            let {name, latitude, longitude, score } = currentCity;
            let currentCityScored = {
                name: name,
                latitude: latitude,
                longitude: longitude,
                score: score,
            }
            switch(true){

                case currentCityScored.score>=0.8:
                    citySuggestions.push(currentCityScored);
                    // citySuggestions.sort((city1, city2) => city2.score - city1.score)
                    readStream.end()
                    
                    break;

                case currentCityScored.score>=0.3:
                    citySuggestions.push(currentCityScored);
                    break

                default:
                    break
            }
        
        }) 

        // if(!citySuggestions.length){
        //     response.json({suggesions: []})
        // }

        
        readStream.on('close', () => { 
            citySuggestions.sort((city1, city2) => city2.score - city1.score)
            let topfiveCities = citySuggestions.splice(0, 5);
            response.json(topfiveCities);
        });

    } else {
        response.send('No input! Input something ye bish')
    }    
    // request.query.q = the city name
    // request.query.longitude = longitude
    // request.query.latitude = latitude


})

const port = process.env.PORT || 2345;
app.listen(port);
console.log('Server running at http://localhost:%d/', port);

module.exports = app;
