@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  Rendez-vous dans {{ $daysBefore }} jour{{ $daysBefore > 1 ? 's' : '' }} 📅
</h2>

<p>{{ $userName }}, on n'oublie pas — voici ce qui t'attend :</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background:#0F0F0F;border:1px solid rgba(201,168,76,0.2);border-radius:12px;overflow:hidden;">
  @if($event->cover_image)
  <tr><td>
    <img src="{{ config('app.url') }}/storage/{{ $event->cover_image }}" alt="" style="width:100%;height:auto;display:block;">
  </td></tr>
  @endif
  <tr><td style="padding:28px;">
    <h3 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#fff;">{{ $event->title }}</h3>
    <p style="margin:12px 0 0;color:#C9A84C;font-size:15px;">
      📅 {{ $event->starts_at?->translatedFormat('l j F Y \à H\hi') }}
    </p>
    @if($event->location)
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
      📍 {{ $event->location }}
    </p>
    @endif
    <p style="margin:16px 0 0;color:rgba(255,255,255,0.85);">
      {{ \Illuminate\Support\Str::limit($event->description, 220) }}
    </p>
    <p style="margin:20px 0 0;text-align:center;">
      <a href="{{ config('app.url') }}/evenements/{{ $event->slug }}"
         style="display:inline-block;padding:12px 28px;background:#8B1A2F;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
        Voir l'événement
      </a>
    </p>
  </td></tr>
</table>

<p>À très vite,</p>
<p style="margin:4px 0 0;color:#C9A84C;font-style:italic;">L'équipe NWC</p>
@endsection
