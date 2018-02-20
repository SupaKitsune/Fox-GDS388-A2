var http = require('http')
var path = require('path')
var express = require('express')
var logger = require('morgan')

var bodyParser = require('body-parser')
var cookieParser = require("cookie-parser")
var passport = require("passport")
var session = require("express-session")

var MongoClient = require('mongodb').MongoClient
var url = "mongodb://Fox:Foxy@ds235768.mlab.com:35768/fox_sandbox_games"

var dbObj = null
var usersCollection = null
var topicCollection = null
var topicListCollection = null

var user = null

var app = express()

app.set('views', path.resolve(__dirname, 'views'))
app.set('view engine', 'ejs')

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
		usersCollection.findOne({username:username}, function(error, result){
			if(result.password === password)//where three equal signs means exactly equal to
			{
				user = result;
				done(null, user)
			}
			else
			{
				done(null, false, {message:"Bad Password"})
			}
		})
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

function matchUser(request, response, next){
	
}

app.get("/logout", function(request, response){
	request.logout()
	response.redirect("/sign-in")
})

app.get("/", ensureAuthenticated, function(request, response){
	MongoClient.connect(url, function(error, db){
		if(error)throw error;
		
		if(topicCollection != null){
			topicCollection.find().toArray(function(error, result){
				if(error)throw error;
				
				response.render("index", {topics:result})
			})
		}
		else{
			response.render("pick-topic", {selection:user})
		}
	})
})

app.get("/new-entry", ensureAuthenticated, function(request,response){
	response.render("new-entry")
})

app.get("/new-topic", ensureAuthenticated, function(request,response){
	response.render("new-topic")
})

app.get("/sign-in", function(request,response){
	response.render("sign-in")
})

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
		
		//var dbObj = db.db("fox_sandbox_games")
		
		dbObj.collection("games").save(request.body, function(error, result){
			console.log("Save made to database.")
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

app.post("/new-topic", function(request, response){
	if(!request.body.title || !request.body.body){
		response.status(400).send("EEF/n(empty entry forbidden)")
		return;
	}
	
	var title = JSON.stringify(request.body.title)
	
	dbObj.collection(title).save(request.body,function(error, result){
		
		console.log("Saved " + title + " topic.")
		topicCollection = dbObj.collection(title)
		response.redirect("/")
	})
})

app.post("/sign-up", function(request, response){
	console.log(request.body)
	MongoClient.connect(url, function(error, db){
		if(error) throw error;
		
		//var dbObj = db.db("fox_sandbox_games")
		//var collection = dbObj.collection("users")
		// var user = {
			// username: request.body.username,
			// password: request.body.password
		// }
		var user = request.body
		
		usersCollection.insert(user, function(error, result){
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
	}
)

app.use(function(request, response){
	response.status(404).render("404")
})

http.createServer(app).listen(3000, function(){
	console.log("Topic list running on port 3000.")
	
	MongoClient.connect(url, function(error, db){
		if(error) throw error;
		
		dbObj = db.db("fox_sandbox_games")
		usersCollection = dbObj.collection("users")
		
		console.log("Database connected.")
	})
})