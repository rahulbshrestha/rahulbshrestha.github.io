---
layout: homepage
---

<div class="row">
    <div class="col-md-7">
      <p>Hi! I'm a predoctoral researcher in the <a href="https://is.mpg.de/ei">Department of Empirical Inference</a> at the Max Planck Institute for Intelligent Systems in Tübingen, working with <a href="https://is.mpg.de/~bs">Bernhard Schölkopf</a> and <a href="https://zhijing-jin.com/">Zhijing Jin</a>. I also do research at the Jinesis Lab at the University of Toronto.</p>
      <p>I'm interested in causality and LLMs. I want to understand how LLMs acquire reasoning capabilities, and I think causality provides a great framework to study this. I also lead the <a href="https://github.com/causalNLP/causal-agent">Causal AI Scientist</a> project, building LLM agents that run causal analyses on real-world data.</p>
  
      <p>Before this, I did my MSc in Informatics at TU Munich and my BSc in Computer Science at Jacobs University Bremen, both in Germany 🇩🇪.  I grew up in Kathmandu, Nepal 🇳🇵. </p>
      <p>Outside research, I play football ⚽, go to the gym 🏋️, play guitar 🎸, cook a lot (hand-pulled noodles are my weakness 🍜), travel whenever I can ✈️, and love well-written blog posts about lives very different from mine. 📖 <a href="mailto:{{ site.email }}">Reach out</a> if you want to chat! :)</p>
<div>&nbsp;</div>
      <p><u><a href="https://drive.google.com/file/d/1oPHVI89xoA7P31wOxD8m_oE5NOYv87zB/view?usp=sharing">CV</a></u> / <a href="mailto:{{ site.email }}"><u>email</u></a> / <a href="https://github.com/rahulbshrestha"><u>github</u></a> / <a href="https://www.linkedin.com/in/rahulbshrestha"><u>linkedin</u></a> / <a href="https://twitter.com/rahulbshrestha"><u>twitter</u></a> / <a href="https://scholar.google.com/citations?user=BKGkcH8AAAAJ"><u>google scholar</u></a></p>
    </div>
    <div class="col-md-4">
        <img id="profile-photo" src="{{ '/assets/img/profile.jpg' | relative_url }}" alt="Rahul Shrestha at the Golden Gate Bridge" title="psst... click me">
    </div>
</div>
<div>&nbsp;</div>

<h2>Selected Works</h2>
{% for paper in site.data.papers %}
<div class="paper">
  <div class="paper-thumb">
    {% assign paper_link = paper.links | where: "name", "paper" | first | default: paper.links.first %}
    {% if paper.img %}<a href="{% if paper_link %}{{ paper_link.url }}{% else %}{{ paper.img | relative_url }}{% endif %}" title="Open paper"><img src="{{ paper.img | relative_url }}" alt="{{ paper.title }}"></a>{% endif %}
  </div>
  <div class="paper-info">
    <h4>{{ paper.title }}</h4>
    {{ paper.authors | replace: "Rahul B. Shrestha", "<b>Rahul B. Shrestha</b>" }} <br>
    <i>{{ paper.venue }},</i> {{ paper.year }} <br>
    {% for link in paper.links %}[<a href="{{ link.url }}">{{ link.name }}</a>] {% endfor %}
  </div>
</div>
{% endfor %}

<p style="font-size:10px;">* denotes equal contribution, † denotes core contributor</p>

<script src="{{ '/assets/js/retro-egg.js' | relative_url }}"></script>
