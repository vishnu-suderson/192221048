const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;
const WINDOW_SIZE = 10;
const BASE_URL = "http://20.244.56.144/evaluation-service";
const AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ0MjEwMTQ5LCJpYXQiOjE3NDQyMDk4NDksImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImUwOGNjM2I1LWFjNzMtNDcyZC05MjY1LTZlZGIwMDhlOWM0OSIsInN1YiI6InZpc2hudXN1ZGVyc29ubTEwNDguc3NlQHNhdmVldGhhLmNvbSJ9LCJlbWFpbCI6InZpc2hudXN1ZGVyc29ubTEwNDguc3NlQHNhdmVldGhhLmNvbSIsIm5hbWUiOiJ2aXNobnUgc3VkZXJzb24gbSIsInJvbGxObyI6IjE5MjIyMTA0OCIsImFjY2Vzc0NvZGUiOiJWbUdSanQiLCJjbGllbnRJRCI6ImUwOGNjM2I1LWFjNzMtNDcyZC05MjY1LTZlZGIwMDhlOWM0OSIsImNsaWVudFNlY3JldCI6IlFUVGtqU0ZUQ0pyZlRGa1UifQ.XN9QnsGscsZONz7b0L_EEvV8eoBI5XEAP-f5KcHcVS4";

const AUTH_HEADER = {
    headers: {
        Authorization: AUTH_TOKEN
    }
};

let cachedPosts = {
    latest: [],
    popular: []
};

const getUsers = async () => {
    const { data } = await axios.get(`${BASE_URL}/users`, AUTH_HEADER);
    return data.users;
};
const getUserPosts = async (userId) => {
    const { data } = await axios.get(`${BASE_URL}/users/${userId}/posts`, AUTH_HEADER);
    return data.posts || [];
};
const fetchAllPosts = async () => {
    const users = await getUsers();
    let allPosts = [];

    const userIds = Object.keys(users);
    for (const userId of userIds) {
        try {
            const posts = await getUserPosts(userId);
            allPosts = allPosts.concat(posts);
        } catch (err) {
            console.error(`Error fetching posts for user ${userId}:`, err.message);
        }
    }

    return allPosts;
};

const analyzePosts = async () => {
    const posts = await fetchAllPosts();

    const latestPosts = [...posts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    const popularPosts = [...posts].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    const maxComments = popularPosts[0]?.comments?.length || 0;
    const topPopularPosts = popularPosts.filter(p => (p.comments?.length || 0) === maxComments);

    cachedPosts.latest = latestPosts;
    cachedPosts.popular = topPopularPosts;

    return posts;
};
app.get("/posts", async (req, res) => {
    const type = req.query.type;

    if (!["latest", "popular"].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Use 'latest' or 'popular'." });
    }

    if (cachedPosts.latest.length === 0 && cachedPosts.popular.length === 0) {
        await analyzePosts();
    }

    return res.json(cachedPosts[type]);
});

app.get("/average-comments", async (req, res) => {
    try {
        const posts = await fetchAllPosts();
        const totalPosts = posts.length;
        const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);

        const average = totalPosts > 0 ? (totalComments / totalPosts).toFixed(2) : 0;

        res.json({
            totalPosts,
            totalComments,
            averageCommentsPerPost: parseFloat(average)
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to calculate average comments", details: err.message });
    }
});
app.get("/users", async (req, res) => {
    try {
        const Users = await getUsers();
        

        res.json({
            totalUsers: Users.length,
            users: Users
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to get users", details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    analyzePosts();
});
