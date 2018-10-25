const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const validatePostInput = require('../../validation/post');

// @route   GET api/posts/test
// @desc    Tests post route
// @access  Public
router.get('/test', (req, res) => res.json({msg: 'Posts work'}));

// @route   GET api/posts
// @desc    Get posts
// @access  Public
router.get('/', (req, res) => {
    Post.find()
        .sort({date: -1})
        .then(posts => res.json(posts))
        .catch(err => res.status(404).json({nopostfound: 'No post found with that id'}));
});

// @route   GET api/posts/:id
// @desc    Get posts by id
// @access  Public
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(posts => res.json(posts))
        .catch(err => res.status(404).json({nopostfound: 'No post found with that id'}));
});

// @route   POST api/posts
// @desc    Create posts
// @access  Private - use passport to authenticate
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // check validation
    if(!isValid) {
        return res.status(400).json(errors);
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id,
    });

    newPost.save().then(post => res.json(post));
});

// @route   DELETE api/post/:id
// @desc    Delete post by id
// @access  Private - protected route using passport
router.delete('/:id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // check for post owner
                    if(post.user.toString() !== req.user.id) {
                        return res.status(401).json({ notauthorized: 'User not authorized'});
                    }

                    // delete
                    post.remove().then(() => res.json({ success: true }))
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
        })
        .catch(err => res.status(404).json(err));
});

// @route   POST api/posts/like/:id
// @desc    Like post
// @access  Private - protected route using passport
router.post('/like/:id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // check if user already liked post
                    if(post.likes.filter(like => like.user.toString() === req.user.id.length > 0)) {
                        return res.status(400).json({ alreadyliked: 'User already liked this post'});
                    }

                    // add user id to likes array
                    post.likes.unshift({ user: req.user.id })

                    post.save().then(post => res.json(post));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
        })
        .catch(err => res.status(404).json(err));
});

// @route   POST api/posts/unlike/:id
// @desc    Unike post
// @access  Private - protected route using passport
router.post('/unlike/:id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // check if user already liked post
                    if(post.likes.filter(like => like.user.toString() === req.user.id.length === 0)) {
                        return res.status(400).json({ notliked: 'You have not liked this post yet'});
                    }

                    // get remove index
                    const removeIndex = post.likes 
                        .map(item => item.user.toString())
                        .indexOf(req.user.id);

                    post.likes.splice(removeIndex, 1);

                    post.save().then(post => res.json(post));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
        })
        .catch(err => res.status(404).json(err));
});

// @route   POST api/posts/comments/:id
// @desc    Add a comment to a post
// @access  Private - use passport to authenticate
router.post('/comment/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // check validation
    if(!isValid) {
        return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id,
            }

            // add to comments array   
            post.comments.unshift(newComment);
            post.save().then(post => res.json(post))
        })
        .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
});

// @route   DELETE api/posts/comments/:id/:comment_id
// @desc    Delete a comment from a post
// @access  Private - use passport to authenticate
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Post.findById(req.params.id)
        .then(post => {
            // check to see if comment exists
            if(post.comment.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
                return res.status(404).json({ commentnotexist: 'Comment does not exist'});
            }

            // get remove index
            const removeIndex = post.comments
                .map(item => item._id.toString())
                .indexOf(req.params.comment_id);

            // splice comment out of array
            post.comments.splice(removeIndex, 1);

            post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
});


module.exports = router;