document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase client
    const supabaseUrl = 'https://rstyqvkagtnnwwmnckub.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdHlxdmthZ3Rubnd3bW5ja3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1MjAsImV4cCI6MjA2NjM3MjUyMH0.G1jo9bYAYicS5hflXpahiq2lbrGyKr77cnZx9y-hfPo';
    const supabase = supabase.createClient(supabaseUrl, supabaseKey);

    // DOM Elements
    const tabLinks = document.querySelectorAll('nav ul li a');
    const tabContents = document.querySelectorAll('.tab-content');
    const postForm = document.getElementById('post-form');
    const postTypeSelect = document.getElementById('post-type');
    const complaintTypeGroup = document.getElementById('complaint-type-group');
    const locationGroup = document.getElementById('location-group');
    const dateGroup = document.getElementById('date-group');
    const lostItemsContainer = document.getElementById('lost-items');
    const foundItemsContainer = document.getElementById('found-items');
    const complaintsContainer = document.getElementById('complaints-list');
    const recentItemsContainer = document.getElementById('recent-items');
    const lostCount = document.getElementById('lost-count');
    const foundCount = document.getElementById('found-count');
    const complaintsCount = document.getElementById('complaints-count');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.querySelector('.close-btn');

    // Tab Switching
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and contents
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked link and corresponding content
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Load appropriate content
            if (tabId === 'lost') {
                loadLostItems();
            } else if (tabId === 'found') {
                loadFoundItems();
            } else if (tabId === 'complaints') {
                loadComplaints();
            } else if (tabId === 'home') {
                loadStats();
                loadRecentItems();
            }
        });
    });

    // Form field visibility based on post type
    postTypeSelect.addEventListener('change', function() {
        if (this.value === 'complaint') {
            complaintTypeGroup.style.display = 'block';
            locationGroup.style.display = 'block';
            dateGroup.style.display = 'block';
        } else if (this.value === 'lost' || this.value === 'found') {
            complaintTypeGroup.style.display = 'none';
            locationGroup.style.display = 'block';
            dateGroup.style.display = 'block';
        } else {
            complaintTypeGroup.style.display = 'none';
            locationGroup.style.display = 'none';
            dateGroup.style.display = 'none';
        }
    });

    // Form submission
    postForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const postType = postTypeSelect.value;
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const date = document.getElementById('date').value;
        const contact = document.getElementById('contact').value || 'Not provided';
        const imageFile = document.getElementById('image').files[0];
        const complaintType = document.getElementById('complaint-type').value;
        
        // Create new post object
        const newPost = {
            type: postType,
            title: title,
            description: description,
            location: location,
            date: date,
            contact: contact
        };
        
        if (postType === 'complaint') {
            newPost.complaint_type = complaintType;
        }
        
        // Upload image if provided
        if (imageFile) {
            const fileName = `${Date.now()}-${imageFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile);
            
            if (uploadError) {
                console.error('Image upload error:', uploadError);
                alert('Image upload failed. Post will be submitted without image.');
            } else {
                newPost.image_url = `${supabaseUrl}/storage/v1/object/public/post-images/${fileName}`;
            }
        }
        
        // Add to Supabase
        const { data, error } = await supabase
            .from('posts')
            .insert([newPost])
            .select();
        
        if (error) {
            console.error('Error adding post:', error);
            alert('Error submitting post!');
        } else {
            // Reset form
            this.reset();
            alert('Post submitted successfully!');
            
            // Update displays
            loadStats();
            loadRecentItems();
            
            // Switch to appropriate tab
            if (postType === 'lost') {
                document.querySelector('nav ul li a[data-tab="lost"]').click();
            } else if (postType === 'found') {
                document.querySelector('nav ul li a[data-tab="found"]').click();
            } else if (postType === 'complaint') {
                document.querySelector('nav ul li a[data-tab="complaints"]').click();
            }
        }
    });

    // Display functions
    async function loadStats() {
        const { count: lostItems } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'lost');
        
        const { count: foundItems } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'found');
        
        const { count: complaints } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'complaint');
        
        lostCount.textContent = lostItems || 0;
        foundCount.textContent = foundItems || 0;
        complaintsCount.textContent = complaints || 0;
    }

    async function loadRecentItems() {
        const { data: recentPosts, error } = await supabase
            .from('posts')
            .select('*')
            .order('posted_at', { ascending: false })
            .limit(3);
        
        recentItemsContainer.innerHTML = '';
        
        if (error) {
            console.error('Error loading recent posts:', error);
            recentItemsContainer.innerHTML = '<p>Error loading recent posts.</p>';
            return;
        }
        
        if (recentPosts.length === 0) {
            recentItemsContainer.innerHTML = '<p>No recent posts available.</p>';
            return;
        }
        
        recentPosts.forEach(post => {
            const item = createPostCard(post);
            recentItemsContainer.appendChild(item);
        });
    }

    async function loadLostItems() {
        const { data: lostItems, error } = await supabase
            .from('posts')
            .select('*')
            .eq('type', 'lost')
            .order('posted_at', { ascending: false });
        
        lostItemsContainer.innerHTML = '';
        
        if (error) {
            console.error('Error loading lost items:', error);
            lostItemsContainer.innerHTML = '<p>Error loading lost items.</p>';
            return;
        }
        
        if (lostItems.length === 0) {
            lostItemsContainer.innerHTML = '<p>No lost items reported yet.</p>';
            return;
        }
        
        lostItems.forEach(item => {
            const card = createPostCard(item);
            lostItemsContainer.appendChild(card);
        });
    }

    async function loadFoundItems() {
        const { data: foundItems, error } = await supabase
            .from('posts')
            .select('*')
            .eq('type', 'found')
            .order('posted_at', { ascending: false });
        
        foundItemsContainer.innerHTML = '';
        
        if (error) {
            console.error('Error loading found items:', error);
            foundItemsContainer.innerHTML = '<p>Error loading found items.</p>';
            return;
        }
        
        if (foundItems.length === 0) {
            foundItemsContainer.innerHTML = '<p>No found items posted yet.</p>';
            return;
        }
        
        foundItems.forEach(item => {
            const card = createPostCard(item);
            foundItemsContainer.appendChild(card);
        });
    }

    async function loadComplaints() {
        const { data: complaints, error } = await supabase
            .from('posts')
            .select('*')
            .eq('type', 'complaint')
            .order('posted_at', { ascending: false });
        
        complaintsContainer.innerHTML = '';
        
        if (error) {
            console.error('Error loading complaints:', error);
            complaintsContainer.innerHTML = '<p>Error loading complaints.</p>';
            return;
        }
        
        if (complaints.length === 0) {
            complaintsContainer.innerHTML = '<p>No community complaints posted yet.</p>';
            return;
        }
        
        complaints.forEach(complaint => {
            const card = createPostCard(complaint);
            complaintsContainer.appendChild(card);
        });
    }

    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = post.type === 'complaint' ? 'complaint-card' : 'item-card';
        
        let typeLabel = '';
        if (post.type === 'lost') {
            typeLabel = '<span class="type lost">Lost</span>';
        } else if (post.type === 'found') {
            typeLabel = '<span class="type found">Found</span>';
        } else if (post.type === 'complaint') {
            typeLabel = '<span class="type complaint">Complaint</span>';
        }
        
        let complaintType = '';
        if (post.type === 'complaint') {
            let typeText = '';
            switch(post.complaint_type) {
                case 'noise':
                    typeText = 'Noise Pollution';
                    break;
                case 'sanitation':
                    typeText = 'Sanitation Issues';
                    break;
                case 'security':
                    typeText = 'Security Concerns';
                    break;
                default:
                    typeText = 'Other Issues';
            }
            complaintType = `<p class="complaint-type">Type: ${typeText}</p>`;
        }
        
        let imageHtml = '';
        if (post.image_url) {
            imageHtml = `<img src="${post.image_url}" alt="${post.title}" style="max-width: 100%; margin-bottom: 10px;">`;
        }
        
        card.innerHTML = `
            ${typeLabel}
            ${imageHtml}
            <h3>${post.title}</h3>
            <div class="meta">
                <span>${post.location}</span>
                <span>${post.date}</span>
            </div>
            ${complaintType}
            <p class="description">${post.description}</p>
            <p class="contact">Contact: ${post.contact}</p>
            <button class="view-details" data-id="${post.id}">View Details</button>
        `;
        
        return card;
    }

    // Search and filter functionality
    document.getElementById('search-lost-btn').addEventListener('click', async function() {
        const searchTerm = document.getElementById('lost-search').value.toLowerCase();
        
        const { data: filtered, error } = await supabase
            .from('posts')
            .select('*')
            .eq('type', 'lost')
            .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
        
        lostItemsContainer.innerHTML = '';
        
        if (error) {
            console.error('Search error:', error);
            lostItemsContainer.innerHTML = '<p>Error searching lost items.</p>';
            return;
        }
        
        if (filtered.length === 0) {
            lostItemsContainer.innerHTML = '<p>No matching lost items found.</p>';
            return;
        }
        
        filtered.forEach(item => {
            const card = createPostCard(item);
            lostItemsContainer.appendChild(card);
        });
    });

    document.getElementById('search-found-btn').addEventListener('click', async function() {
        const searchTerm = document.getElementById('found-search').value.toLowerCase();
        
        const { data: filtered, error } = await supabase
            .from('posts')
            .select('*')
            .eq('type', 'found')
            .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
        
        foundItemsContainer.innerHTML = '';
        
        if (error) {
            console.error('Search error:', error);
            foundItemsContainer.innerHTML = '<p>Error searching found items.</p>';
            return;
        }
        
        if (filtered.length === 0) {
            foundItemsContainer.innerHTML = '<p>No matching found items found.</p>';
            return;
        }
        
        filtered.forEach(item => {
            const card = createPostCard(item);
            foundItemsContainer.appendChild(card);
        });
    });

    document.getElementById('filter-complaints-btn').addEventListener('click', async function() {
        const filterValue = document.getElementById('complaint-filter').value;
        let query = supabase
            .from('posts')
            .select('*')
            .eq('type', 'complaint');
        
        if (filterValue !== 'all') {
            query = query.eq('complaint_type', filterValue);
        }
        
        const { data: filtered, error } = await query;
        
        complaintsContainer.innerHTML = '';
        
        if (error) {
            console.error('Filter error:', error);
            complaintsContainer.innerHTML = '<p>Error filtering complaints.</p>';
            return;
        }
        
        if (filtered.length === 0) {
            complaintsContainer.innerHTML = '<p>No matching complaints found.</p>';
            return;
        }
        
        filtered.forEach(complaint => {
            const card = createPostCard(complaint);
            complaintsContainer.appendChild(card);
        });
    });

    // Modal functionality
    function openModal(post) {
        let typeText = '';
        if (post.type === 'lost') {
            typeText = 'Lost Item';
        } else if (post.type === 'found') {
            typeText = 'Found Item';
        } else {
            typeText = 'Community Complaint';
        }
        
        let complaintType = '';
        if (post.type === 'complaint') {
            let typeText = '';
            switch(post.complaint_type) {
                case 'noise':
                    typeText = 'Noise Pollution';
                    break;
                case 'sanitation':
                    typeText = 'Sanitation Issues';
                    break;
                case 'security':
                    typeText = 'Security Concerns';
                    break;
                default:
                    typeText = 'Other Issues';
            }
            complaintType = `<p><strong>Complaint Type:</strong> ${typeText}</p>`;
        }
        
        let imageHtml = '';
        if (post.image_url) {
            imageHtml = `<img src="${post.image_url}" alt="${post.title}" style="max-width: 100%; margin: 15px 0;">`;
        }
        
        modalContent.innerHTML = `
            <h2>${post.title}</h2>
            <p><strong>Type:</strong> ${typeText}</p>
            <p><strong>Posted:</strong> ${new Date(post.posted_at).toLocaleDateString()}</p>
            ${complaintType}
            <p><strong>Location:</strong> ${post.location}</p>
            <p><strong>Date:</strong> ${post.date}</p>
            ${imageHtml}
            <p><strong>Description:</strong></p>
            <p>${post.description}</p>
            <p><strong>Contact Information:</strong> ${post.contact}</p>
        `;
        
        modal.style.display = 'block';
    }

    // Close modal when clicking X
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Event delegation for view details buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-details')) {
            const postId = e.target.getAttribute('data-id');
            getPostDetails(postId);
        }
    });

    async function getPostDetails(postId) {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (error) {
            console.error('Error fetching post:', error);
            alert('Error loading post details');
        } else {
            openModal(post);
        }
    }

    // Initialize realtime updates
    supabase
        .channel('posts-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'posts' },
            () => {
                // Refresh all data when any change occurs
                loadStats();
                loadRecentItems();
                if (document.querySelector('.tab-content.active').id === 'lost') loadLostItems();
                if (document.querySelector('.tab-content.active').id === 'found') loadFoundItems();
                if (document.querySelector('.tab-content.active').id === 'complaints') loadComplaints();
            }
        )
        .subscribe();

    // Initialize the page
    loadStats();
    loadRecentItems();
    loadLostItems();
    loadFoundItems();
    loadComplaints();
});