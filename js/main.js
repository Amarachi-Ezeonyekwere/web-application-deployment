jQuery(document).ready(function($) {

	'use strict';

        $(window).on("load", function() { // makes sure the whole site is loaded
            $(".seq-preloader").fadeOut(); // will first fade out the loading animation
            $(".sequence").delay(500).fadeOut("slow"); // will fade out the white DIV that covers the website.
        })
      
        
        $(function() {
  
        function showSlide(n) {
            // n is relative position from current slide
          
            // unbind event listener to prevent retriggering
            $body.unbind("mousewheel");
          
            // increment slide number by n and keep within boundaries
            currSlide = Math.min(Math.max(0, currSlide + n), $slide.length-1);
            
            var displacment = window.innerWidth*currSlide;
            // translate slides div across to appropriate slide
            $slides.css('transform', 'translateX(-' + displacment + 'px)');
            // delay before rebinding event to prevent retriggering
            setTimeout(bind, 700);
            
            // change active class on link
            $('nav a.active').removeClass('active');
            $($('a')[currSlide]).addClass('active');
            
        }
      
        function bind() {
             $body.bind('mousewheel', mouseEvent);
          }
      
        function mouseEvent(e, delta) {
            // On down scroll, show next slide otherwise show prev slide
            showSlide(delta >= 0 ? -1 : 1);
            e.preventDefault();
        }
        
        $('nav a, .main-btn a').click(function(e) {
            // When link clicked, find slide it points to
            var newslide = parseInt($(this).attr('href')[1]);
            // find how far it is from current slide
            var diff = newslide - currSlide - 1;
            showSlide(diff); // show that slide
            e.preventDefault();
        });
      
        $(window).resize(function(){
          // Keep current slide to left of window on resize
          var displacment = window.innerWidth*currSlide;
          $slides.css('transform', 'translateX(-'+displacment+'px)');
        });
        
        // cache
        var $body = $('body');
        var currSlide = 0;
        var $slides = $('.slides');
        var $slide = $('.slide');
      
        // give active class to first link
        $($('nav a')[0]).addClass('active');
        
        // add event listener for mousescroll
        $body.bind('false', mouseEvent);
    })        


        $('#form-submit .date').datepicker({
        });


        $(window).on("scroll", function() {
            if($(window).scrollTop() > 100) {
                $(".header").addClass("active");
            } else {
                //remove the background property so it comes transparent again (defined in your css)
               $(".header").removeClass("active");
            }
        });


});
// Robust sendMessage: keyword matching + clickable link + typing + safe DOM insertion
async function sendMessage() {
  const inputEl = document.getElementById("chat-input");
  const chatBox  = document.getElementById("chat-box");
  if (!inputEl || !chatBox) {
    console.error("Chat elements missing (#chat-input or #chat-box).");
    return;
  }

  const raw = inputEl.value.trim();
  if (!raw) return;

  // Safely append user message (no innerHTML with user text)
  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = raw;
  chatBox.appendChild(userDiv);
  inputEl.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  // Typing indicator
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Load projects.json
  let data;
  try {
    const res = await fetch("js/projects.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
    console.log("Chat: loaded projects.json", data);
  } catch (err) {
    console.error("Chat: failed to load projects.json", err);
    typing.remove();
    const errDiv = document.createElement("div");
    errDiv.className = "message bot";
    errDiv.textContent = "⚠️ Unable to load project data right now.";
    chatBox.appendChild(errDiv);
    return;
  }

  // Build a normalized projects list with keywords, answer, and link
  const projectsList = [];

  if (Array.isArray(data.projects)) {
    for (const p of data.projects) {
      const answer = p.answer || p.answer || "";
      const link   = p.link || null;
      // keywords: explicit array if present, otherwise extract from question text
      let keywords = [];
      if (Array.isArray(p.keywords) && p.keywords.length) {
        keywords = p.keywords.map(k => String(k).toLowerCase());
      } else if (p.question) {
        keywords = String(p.question).toLowerCase().match(/\b[a-z0-9\-]{3,}\b/g) || [];
      }
      projectsList.push({ answer, link, keywords });
    }
  } else {
    // fallback mapping for legacy shape: { monitoring: "...", "cloud-infra": "...", automation: "...", linux: "..." }
    const fallback = [
      { keys: ["monitoring","datadog","alert"], answer: data.monitoring || data["monitoring"] || data["monitoring "] || "" , link: null },
      { keys: ["cloud","azure","gcp","aws","infra","infrastructure"], answer: data["cloud-infra"] || data["cloudInfra"] || data["cloud"] || "" , link: null },
      { keys: ["automation","ci/cd","cicd","pipeline"], answer: data.automation || "" , link: null },
      { keys: ["linux","bash","shell"], answer: data.linux || "" , link: null },
    ];
    for (const f of fallback) projectsList.push({ answer: f.answer, link: f.link, keywords: f.keys });
  }

  // Always include some common keywords if none were detected
  if (projectsList.length === 0) {
    projectsList.push({ answer: "", link: null, keywords: ["monitoring","cloud","automation","linux","container","cicd"] });
  }

  // Match keywords in the user's message (case-insensitive)
  const lower = raw.toLowerCase();
  const matches = projectsList.filter(p => p.keywords.some(k => lower.includes(k)));

  // If nothing matched, attempt a simple contains for known words as backup
  const fallbackKeywords = [
    {k:"monitoring", idx: projectsList.findIndex(p => p.answer.toLowerCase().includes("monitor"))},
    {k:"cloud", idx: projectsList.findIndex(p => p.answer.toLowerCase().includes("cloud"))},
    {k:"automation", idx: projectsList.findIndex(p => p.answer.toLowerCase().includes("ci"))},
    {k:"linux", idx: projectsList.findIndex(p => p.answer.toLowerCase().includes("linux"))}
  ];

  if (matches.length === 0) {
    for (const fk of fallbackKeywords) {
      if (lower.includes(fk.k) && fk.idx >= 0) {
        matches.push(projectsList[fk.idx]);
      }
    }
  }

  // Build bot reply(s)
  const replies = [];
  if (matches.length > 0) {
    // keep unique answers (in case multiple keywords map to same project)
    const seen = new Set();
    for (const m of matches) {
      if (!m.answer) continue;
      const key = m.answer + (m.link||"");
      if (seen.has(key)) continue;
      seen.add(key);
      replies.push({ text: m.answer, link: m.link || null });
    }
  } else {
    // default fallback text (try to use generic fields if present)
    const defaultText = data.defaultReply || "I’m not sure about that. Try asking about monitoring, cloud, automation, containers or Linux.";
    replies.push({ text: defaultText, link: null });
  }

  // Simulate typing delay then append replies (1.2s)
  setTimeout(() => {
    typing.remove();
    for (const r of replies) {
      const botDiv = document.createElement("div");
      botDiv.className = "message bot";
      botDiv.textContent = r.text;
      chatBox.appendChild(botDiv);
if (r.link) {
    const linkDiv = document.createElement("div");
    linkDiv.className = "message bot";
    const a = document.createElement("a");
    a.href = "#"; // prevents default navigation
    a.textContent = "🔗 View Screenshot";
    a.style.cursor = "pointer"; // makes it obvious it's clickable
    a.onclick = function(e) {
        e.preventDefault(); // prevent page jump
        openImage(r.link);  // call your modal function
    };
    linkDiv.appendChild(a);
    chatBox.appendChild(linkDiv);
}
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  }, 1200);

  // Attach Enter-key handler once (non-invasive)
  if (!window.__chat_enter_attached) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
    window.__chat_enter_attached = true;
  }
}
// ---------- Toggle (jQuery, minimal & safe) ----------
jQuery(function($) {
  var $chatContainer = $('#chat-container');
  var $toggleBtn     = $('#toggle-chat');
  var $chatBubble    = $('#chat-bubble');
  var $chatInput     = $('#chat-input');

  // Safety: if essential elements missing, log and stop
  if (!$chatContainer.length || !$toggleBtn.length) {
    console.warn('Chat toggle: missing #chat-container or #toggle-chat');
    return;
  }

  // Update UI function
  function updateUI() {
    var collapsed = $chatContainer.hasClass('collapsed');
    if ($chatBubble.length) $chatBubble.toggle(collapsed);
    $toggleBtn.text(collapsed ? '+' : '−');
  }

  // Ensure only one click handler (prevents duplicates)
  $toggleBtn.off('.chatToggle').on('click.chatToggle', function() {
    $chatContainer.toggleClass('collapsed');
    updateUI();
    if (!$chatContainer.hasClass('collapsed')) {
      setTimeout(function(){ $chatInput && $chatInput.focus(); }, 120);
    }
  });

  // If bubble exists, wire it to open chat
  if ($chatBubble.length) {
    $chatBubble.off('.chatToggle').on('click.chatToggle', function() {
      $chatContainer.removeClass('collapsed');
      updateUI();
      setTimeout(function(){ $chatInput && $chatInput.focus(); }, 120);
    });
  }

  // Initial UI sync
  updateUI();
});

