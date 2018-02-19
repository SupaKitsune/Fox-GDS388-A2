var http = require('http')
var path = require('path')
var express = require('express')
var logger = require('morgan')
var bodyParser = require('body-parser')
var cookieParser = require("cookie-parser")
var passport = require("passport")
var session = require("express-session")
var MongoClient = require('mongodb').MongoClient
//var url = "mongodb://localhost:27017/"
var url = "mongodb://Fox:Foxy@ds235768.mlab.com:35768/fox_sandbox_games"

var app = express()

app.set('views', path.resolve(__dirname, 'views'))
app.set('view engine', 'ejs')

//var entries = []

//app.locals.entries = entries;

app.use(logger('dev'))

app.use(bodyParser.urlencoded({extended:false}))
app.use(cookieParser())
app.use(session({
	secret:"ItMayBeAGoodIdeaToMakeThisLookLikeGarbageSoHackingIsHarder",
	resave:true,
	saveUninitialized:true
}))

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser(function(user, done){
	done(null, user)
})

passport.deserializeUser(function(user, done){
	done(null, user)
})

LocalStrategy = require("passport-local").Strategy
passport.use(new LocalStrategy({
	usernameField:"",
	passwordField:""
	},
	function(username, password, done){
		MongoClient.connect(url, function(error, db){
			if(error)throw error;
			
			var dbObj = db.db("fox_sandbox_games");
			
			dbObj.collection("users").findOne({username:username}, function(error, result){
				if(result.password === password)//where three equal signs means exactly equal to
				{
					var user = result;
					done(null, user)
				}
				else
				{
					done(null, false, {message:"Bad Password"})
				}
			})
		})
		// var user = {
			// username: username,
			// password: password
		// }
		// done(null, user)
	})
)

function ensureAuthenticated(request, response, next){
	if(request.isAuthenticated())
	{
		next()
	}
	else
	{
		response.redirect("/sign-in")
	}
}

app.get("/logout", function(request, response){
	request.logout()
	response.redirect("/sign-in")
})

app.get("/", ensureAuthenticated, function(request, response){
	MongoClient.connect(url, function(error, db){
		if(error)throw error;
		var dbObj = db.db("fox_sandbox_games");
		
		dbObj.collection("games").find().toArray(function(error, result){
			if(error)throw error;
			console.log("Site served")
			db.close()
			response.render("index", {games:result})
		})
	})
})

app.get("/new-entry", ensureAuthenticated, function(request,response){
	response.render("new-entry")
})

app.get("/sign-in", function(request,response){
	response.render("sign-in")
})
//})

app.get("/profile", function(request,response){
	response.json(request.user)
})

app.post("/new-entry", function(request, response){
	if(!request.body.title || !request.body.body){
		response.status(400).send("EEF/n(empty entry forbidden)")
		return;
	}
	//connected to database to save games
	MongoClient.connect(url, function(error, db){
		if(error) throw error;
		
		var dbObj = db.db("fox_sandbox_games")
		
		dbObj.collection("games").save(request.body, function(error, result){
			console.log("Database " + dbObj.name + " save made.")
			db.close()
			response.redirect("/")
		})
	})
	
	/*
	entries.push({
		title:request.body.title,
		body:request.body.body,
		published:new Date()
	})
	*/
	//response.redirect("/")
})

app.post("/sign-up", function(request, response){
	console.log(request.body)
	MongoClient.connect(url, function(error, db){
		if(error) throw error;
		
		var dbObj = db.db("fox_sandbox_games")
		var collection = dbObj.collection("users")
		// var user = {
			// username: request.body.username,
			// password: request.body.password
		// }
		var user = request.body
		
		collection.insert(user, function(error, result){
			if(error)throw error;
			
			request.login(request.body, function(){
				response.redirect("/profile")
			})
		})
	})
})

app.post("/sign-in", passport.authenticate("local",
	{
		failureRedirect:"/sign-in"
	}),
	function(request, response){
		response.redirect("/")
		//response.redirect("/profile")
	}
)

app.use(function(request, response){
	response.status(404).render("404")
})

http.createServer(app).listen(3000, function(){
	console.log("Game library server on port 3000 running")
})