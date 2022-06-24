import client from '../config/db.js'
import { urlMetadataInfo } from '../globalFunctions/urlDataFunction.js'
import postsRepository from "../repositories/postsRepository.js";
import hashtagsRepository from '../repositories/hashtagsRepository.js';

export const newPostController = async (req, res) => {
    const {userId, link, message} = res.locals.postData

    let hashtags = [];
    let newHashtag = [];
    let readNewHashtag = false;
    for(let i = 0; i <= message.length; i++) {
        if(message[i] === "#") {
            readNewHashtag = true;
            newHashtag = ["#"];
            continue;
        }
        if(readNewHashtag) {
            if(message[i] === "#" || message[i] === " " || i === message.length) {
                hashtags.push(newHashtag.join(""));
                readNewHashtag = false;
                continue;
            }
            newHashtag.push(message[i]);
        }
    }

    let uniqueHashtags = [];
    for(let ht of hashtags) {
        if(!uniqueHashtags.includes(ht))
            uniqueHashtags.push(ht);
    }

    try {
        let postId = await client.query(
            `INSERT INTO posts ("userId", link, message) 
             VALUES ($1, $2, $3)
             RETURNING id;`, [userId, link, message])
        for(let ht of uniqueHashtags) {
            let id = await hashtagsRepository.getHashtagIdByTag(ht);
            await client.query(
                `INSERT INTO "postsHashtags" ("postId", "hashtagId")
                VALUES ($1, $2)`, [postId.rows[0].id, id]
            );
        }
        return res.status(201).json({message:'Post criado.'})
    } catch(error) { 
        return  res.status(500).send(error) 
    }
}

export const editPostController = async (req, res) => {
    const { id, message, userId} = res.locals.editPostData
    try {
        await client.query(
            `UPDATE posts
             SET message = $1, edited = $2
             WHERE id = $3 AND "userId" = $4;`, [message, true, id, userId])
        return res.status(200).json({message:'Post editado.'})
    } catch(error) { 
        console.log(error)
        return  res.status(500).send(error.data)
    }
}


export const deletePostController = async (req, res) => {
    const { id } = res.locals
    try {
        await client.query(`DELETE FROM comments WHERE "postsId" = $1;`, [id])
        await client.query(`DELETE FROM repost WHERE "postsId" = $1;`, [id])
        await client.query(`DELETE FROM "postsHashtags" WHERE "postId" = $1;`, [id])
        await client.query(`DELETE FROM likes WHERE "postId" = $1;`, [id])
        await client.query(`DELETE FROM posts WHERE id = $1;`, [id])
        return res.status(200).json({message:'Post deletado.'})
    } catch(error) { 
        console.log(error)
        return  res.status(500).send(error.data)
    }
}


export async function getPostsByHashtag(req, res) {
    let hashtag = "#" + req.params.hashtag;

    try {
        const posts = (await postsRepository.getPostsByHashtag(hashtag)).rows;
        for(let post of posts) {
            post.urlMeta = await urlMetadataInfo(post.link)
        }
        res.send(posts);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

