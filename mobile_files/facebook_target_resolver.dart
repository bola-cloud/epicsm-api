import 'dart:convert';
import 'dart:io';

class FacebookTargetResolver {
  static const String _feedbackPrefix =
      'ZmVlZGJhY2s6';

  // =========================================================
  // PUBLIC
  // =========================================================

  Future<FacebookTargetResult?> resolve({
    required String url,
    required String cookies,
  }) async {
    try {
      if (url.trim().isEmpty) {
        print(
          '❌ Facebook URL is empty',
        );

        return null;
      }

      final normalizedUrl =
      _normalizeFacebookUrl(
        url,
      );

      if (normalizedUrl == null) {
        print(
          '❌ Invalid Facebook URL: $url',
        );

        return null;
      }

      print(
        '🌐 Facebook original URL: $url',
      );

      print(
        '🌐 Facebook normalized URL: '
            '$normalizedUrl',
      );

      return await _fetchAndResolve(
        normalizedUrl,
        cookies,
      );
    } catch (e, stackTrace) {
      print(
        '❌ Facebook resolver error: $e',
      );

      print(
        stackTrace,
      );

      return null;
    }
  }

  // =========================================================
  // NORMALIZE
  // =========================================================

  String? _normalizeFacebookUrl(
      String value,
      ) {
    final uri =
    Uri.tryParse(
      value.trim(),
    );

    if (uri == null) {
      return null;
    }

    final host =
    uri.host.toLowerCase();

    if (host != 'facebook.com' &&
        !host.endsWith(
          '.facebook.com',
        )) {
      return null;
    }

    return uri
        .replace(
      scheme: 'https',
      host: 'www.facebook.com',
    )
        .toString();
  }

  // =========================================================
  // FETCH + RESOLVE
  // =========================================================

  Future<FacebookTargetResult?> _fetchAndResolve(
      String url,
      String cookies,
      ) async {
    HttpClient? client;

    try {
      client =
          HttpClient();

      client.autoUncompress =
      true;

      client.connectionTimeout =
      const Duration(
        seconds: 20,
      );

      final parsedUri =
      Uri.tryParse(
        url,
      );

      if (parsedUri == null) {
        return null;
      }

      Uri currentUri =
          parsedUri;

      // =====================================================
      // TYPE
      // =====================================================

      bool reelMode =
      _isReelUrl(
        currentUri,
      );

      bool videoMode =
          !reelMode &&
              _isVideoUrl(
                currentUri,
              );

      String? contentIdHint;

      if (reelMode ||
          videoMode) {
        contentIdHint =
            _extractContentIdHintFromUri(
              currentUri,
            );
      }

      int redirectCount =
      0;

      const maxRedirects =
      5;

      while (true) {
        // ===================================================
        // UPDATE TYPE AFTER REDIRECT
        // ===================================================

        if (_isReelUrl(
          currentUri,
        )) {
          reelMode =
          true;

          videoMode =
          false;

          contentIdHint ??=
              _extractContentIdHintFromUri(
                currentUri,
              );
        } else if (!reelMode &&
            _isVideoUrl(
              currentUri,
            )) {
          videoMode =
          true;

          contentIdHint ??=
              _extractContentIdHintFromUri(
                currentUri,
              );
        }

        print(
          '🌐 Facebook HTTP GET: '
              '$currentUri',
        );

        final request =
        await client
            .getUrl(
          currentUri,
        )
            .timeout(
          const Duration(
            seconds: 20,
          ),
        );

        request.followRedirects =
        false;

        _applyHeaders(
          request,
          cookies,
        );

        final response =
        await request
            .close()
            .timeout(
          const Duration(
            seconds: 20,
          ),
        );

        print(
          '🌐 Facebook HTTP status: '
              '${response.statusCode}',
        );

        // ===================================================
        // REDIRECT
        // ===================================================

        if (_isRedirectStatus(
          response.statusCode,
        )) {
          final location =
          response.headers.value(
            HttpHeaders.locationHeader,
          );

          await response.drain();

          if (location == null ||
              location.trim().isEmpty) {
            print(
              '❌ Redirect without location',
            );

            return null;
          }

          redirectCount++;

          if (redirectCount >
              maxRedirects) {
            print(
              '❌ Too many redirects',
            );

            return null;
          }

          final nextUri =
          currentUri.resolve(
            location,
          );

          if (!_isFacebookHost(
            nextUri.host,
          )) {
            print(
              '❌ Redirect outside Facebook',
            );

            return null;
          }

          print(
            '➡️ Facebook redirect '
                '#$redirectCount:',
          );

          print(
            '   $currentUri',
          );

          print(
            '   ↓',
          );

          print(
            '   $nextUri',
          );

          currentUri =
              nextUri;

          continue;
        }

        // ===================================================
        // HTTP ERROR
        // ===================================================

        if (response.statusCode <
            200 ||
            response.statusCode >=
                300) {
          await response.drain();

          print(
            '❌ Facebook HTTP failed: '
                '${response.statusCode}',
          );

          return null;
        }

        print(
          '🌐 Facebook final URL: '
              '$currentUri',
        );

        print(
          '🎞️ reelMode = $reelMode',
        );

        print(
          '🎬 videoMode = $videoMode',
        );

        print(
          '🎯 contentIdHint = '
              '${contentIdHint ?? "not found"}',
        );

        if (_isFacebookLoginUrl(
          currentUri,
        )) {
          await response.drain();

          print(
            '❌ Facebook redirected to login',
          );

          return null;
        }

        // ===================================================
        // NORMAL POST FULL HTML ONLY
        //
        // Reel / Video مش هنخزن الصفحة كلها.
        // ===================================================

        final normalHtml =
        StringBuffer();

        // ===================================================
        // NORMAL POST BUFFER
        // ===================================================

        String normalRollingBuffer =
            '';

        const normalRollingLimit =
            256 * 1024;

        String? fastPostId;

        String? fastOwnerId;

        // ===================================================
        // REEL WINDOW
        //
        // بدل 512KB + إعادة Scan باستمرار.
        //
        // بنحتفظ فقط بالمنطقة اللي ممكن تحتوي:
        //
        // feedbackId + reelId
        // ===================================================

        String reelWindow =
            '';

        const reelWindowLimit =
            192 * 1024;

        // ===================================================
        // VIDEO WINDOW
        // ===================================================

        String videoWindow =
            '';

        const videoWindowLimit =
            192 * 1024;

        int receivedLength =
        0;

        await for (
        final chunk
        in response.transform(
          utf8.decoder,
        )
        ) {
          receivedLength +=
              chunk.length;

          // =================================================
          // REEL
          //
          // DIRECT:
          //
          // reelId
          // +
          // nearest Base64 feedback ID
          //
          // فقط.
          // =================================================

          if (reelMode) {
            /*
             * Reel URL الطبيعي فيه ID.
             *
             * لو شكل URL مختلف ومفيهوش ID،
             * نحاول نطلعه من الصفحة مرة واحدة.
             */
            if (contentIdHint ==
                null) {
              contentIdHint =
                  _extractStrongPostId(
                    chunk,
                  );
            }

            final oldWindow =
                reelWindow;

            reelWindow =
                _appendRolling(
                  reelWindow,
                  chunk,
                  reelWindowLimit,
                );

            if (contentIdHint !=
                null) {
              /*
               * مانعملش Scan مع كل chunk.
               *
               * نعمله فقط لو chunk الجديد
               * جاب:
               *
               * reelId
               *
               * أو
               *
               * feedback Base64 prefix.
               */
              final reelAppeared =
              _newMarkerAppeared(
                oldWindow,
                chunk,
                contentIdHint!,
              );

              final feedbackAppeared =
              _newMarkerAppeared(
                oldWindow,
                chunk,
                _feedbackPrefix,
              );

              if (reelAppeared ||
                  feedbackAppeared) {
                final target =
                _extractReelTargetFast(
                  reelWindow,
                  contentIdHint!,
                );

                if (target !=
                    null) {
                  print(
                    '✅ REAL REEL FEEDBACK ID FOUND',
                  );

                  print(
                    '   ├─ received: '
                        '$receivedLength chars',
                  );

                  print(
                    '   ├─ reelId: '
                        '$contentIdHint',
                  );

                  print(
                    '   └─ targetId: '
                        '$target',
                  );

                  return FacebookTargetResult(
                    id:
                    target,
                    ownerId:
                    null,
                    profileId:
                    null,
                    postId:
                    contentIdHint,
                    commentId:
                    null,
                    type:
                    FacebookTargetType.post,
                  );
                }
              }
            }

            /*
             * Reel لا يدخل أي Extractor تاني.
             */
            continue;
          }

          // =================================================
          // VIDEO
          //
          // DIRECT:
          //
          // associated_video
          // +
          // nearest Base64 feedback ID
          // =================================================

          if (videoMode) {
            if (contentIdHint ==
                null) {
              contentIdHint =
                  _extractStrongPostId(
                    chunk,
                  );
            }

            final oldWindow =
                videoWindow;

            videoWindow =
                _appendRolling(
                  videoWindow,
                  chunk,
                  videoWindowLimit,
                );

            final associatedAppeared =
            _newMarkerAppeared(
              oldWindow,
              chunk,
              'associated_video',
            );

            final feedbackAppeared =
            _newMarkerAppeared(
              oldWindow,
              chunk,
              _feedbackPrefix,
            );

            bool idAppeared =
            false;

            if (contentIdHint !=
                null) {
              idAppeared =
                  _newMarkerAppeared(
                    oldWindow,
                    chunk,
                    contentIdHint!,
                  );
            }

            /*
             * مفيش Scan إلا لما حاجة مهمة
             * تكون ظهرت في البيانات الجديدة.
             */
            if (associatedAppeared ||
                feedbackAppeared ||
                idAppeared) {
              final target =
              _extractVideoTargetFast(
                videoWindow,
                contentId:
                contentIdHint,
              );

              if (target !=
                  null) {
                print(
                  '✅ REAL VIDEO FEEDBACK ID FOUND',
                );

                print(
                  '   ├─ received: '
                      '$receivedLength chars',
                );

                print(
                  '   ├─ videoId: '
                      '${contentIdHint ?? "not found"}',
                );

                print(
                  '   └─ targetId: '
                      '$target',
                );

                return FacebookTargetResult(
                  id:
                  target,
                  ownerId:
                  null,
                  profileId:
                  null,
                  postId:
                  contentIdHint,
                  commentId:
                  null,
                  type:
                  FacebookTargetType.post,
                );
              }
            }

            /*
             * Video لا يدخل Post logic.
             */
            continue;
          }

          // =================================================
          // NORMAL POST / PHOTO / STORY
          //
          // نفس المنطق القديم.
          // =================================================

          normalHtml.write(
            chunk,
          );

          normalRollingBuffer +=
              chunk;

          if (normalRollingBuffer.length >
              normalRollingLimit) {
            normalRollingBuffer =
                normalRollingBuffer.substring(
                  normalRollingBuffer.length -
                      normalRollingLimit,
                );
          }

          fastPostId ??=
              _extractStrongPostId(
                normalRollingBuffer,
              );

          fastOwnerId ??=
              _extractStrongOwnerId(
                normalRollingBuffer,
              );

          if (fastPostId != null &&
              fastOwnerId != null) {
            final target =
                '${fastOwnerId}_$fastPostId';

            print(
              '⚡ Facebook target found EARLY',
            );

            print(
              '   ├─ received: '
                  '$receivedLength chars',
            );

            print(
              '   ├─ ownerId: '
                  '$fastOwnerId',
            );

            print(
              '   ├─ postId: '
                  '$fastPostId',
            );

            print(
              '   └─ target: '
                  '$target',
            );

            return FacebookTargetResult(
              id:
              target,
              ownerId:
              fastOwnerId,
              profileId:
              null,
              postId:
              fastPostId,
              commentId:
              null,
              type:
              FacebookTargetType.post,
            );
          }
        }

        // ===================================================
        // STREAM FINISHED
        // ===================================================

        if (reelMode) {
          /*
           * آخر Scan واحد فقط.
           *
           * مش Full HTML.
           */
          if (contentIdHint !=
              null) {
            final target =
            _extractReelTargetFast(
              reelWindow,
              contentIdHint!,
            );

            if (target !=
                null) {
              print(
                '✅ REAL REEL FEEDBACK ID FOUND '
                    'AT STREAM END',
              );

              print(
                '   ├─ reelId: '
                    '$contentIdHint',
              );

              print(
                '   └─ targetId: '
                    '$target',
              );

              return FacebookTargetResult(
                id:
                target,
                ownerId:
                null,
                profileId:
                null,
                postId:
                contentIdHint,
                commentId:
                null,
                type:
                FacebookTargetType.post,
              );
            }
          }

          print(
            '❌ Real Reel feedback ID not found',
          );

          return null;
        }

        if (videoMode) {
          final target =
          _extractVideoTargetFast(
            videoWindow,
            contentId:
            contentIdHint,
          );

          if (target !=
              null) {
            print(
              '✅ REAL VIDEO FEEDBACK ID FOUND '
                  'AT STREAM END',
            );

            print(
              '   ├─ videoId: '
                  '${contentIdHint ?? "not found"}',
            );

            print(
              '   └─ targetId: '
                  '$target',
            );

            return FacebookTargetResult(
              id:
              target,
              ownerId:
              null,
              profileId:
              null,
              postId:
              contentIdHint,
              commentId:
              null,
              type:
              FacebookTargetType.post,
            );
          }

          print(
            '❌ Real Video feedback ID not found',
          );

          return null;
        }

        // ===================================================
        // NORMAL FULL RESOLVER
        // ===================================================

        final html =
        normalHtml.toString();

        print(
          '📏 Facebook full HTML length: '
              '${html.length}',
        );

        print(
          '⚠️ Fast target not found, '
              'using normal full extractor...',
        );

        return _resolveNormalFromFullHtml(
          html,
        );
      }
    } catch (e, stackTrace) {
      print(
        '❌ Facebook HTTP error: $e',
      );

      print(
        stackTrace,
      );

      return null;
    } finally {
      client?.close(
        force: true,
      );
    }
  }

  // =========================================================
  // REEL FAST TARGET
  //
  // مفيش RegExp على 500KB.
  //
  // بنبحث عن Reel ID،
  // وبعده نجيب أقرب feedback Base64 فقط.
  // =========================================================

  String? _extractReelTargetFast(
      String window,
      String reelId,
      ) {
    if (window.isEmpty ||
        reelId.isEmpty) {
      return null;
    }

    /*
     * غالبًا آخر occurrence هو الأقرب
     * للـ object الحالي في stream.
     *
     * نجرب عدد قليل جدًا فقط.
     */
    int reelIndex =
    window.lastIndexOf(
      reelId,
    );

    int checked =
    0;

    while (reelIndex != -1 &&
        checked < 4) {
      final beforePrefix =
      window.lastIndexOf(
        _feedbackPrefix,
        reelIndex,
      );

      final afterPrefix =
      window.indexOf(
        _feedbackPrefix,
        reelIndex +
            reelId.length,
      );

      _FastTargetCandidate? best;

      // =====================================================
      // FEEDBACK BEFORE REEL ID
      // =====================================================

      if (beforePrefix !=
          -1) {
        final distance =
            reelIndex -
                beforePrefix;

        /*
         * نفس المنطقة المنطقية اللي كنا
         * بندور فيها سابقًا،
         * لكن من غير Substring/RegExp ضخمة.
         */
        if (distance <=
            96 * 1024) {
          final target =
          _decodeFeedbackAt(
            window,
            beforePrefix,
          );

          if (target != null &&
              target != reelId) {
            best =
                _FastTargetCandidate(
                  value:
                  target,
                  distance:
                  distance,
                );
          }
        }
      }

      // =====================================================
      // FEEDBACK AFTER REEL ID
      // =====================================================

      if (afterPrefix !=
          -1) {
        final distance =
            afterPrefix -
                reelIndex;

        if (distance <=
            96 * 1024) {
          final target =
          _decodeFeedbackAt(
            window,
            afterPrefix,
          );

          if (target != null &&
              target != reelId) {
            if (best == null ||
                distance <
                    best.distance) {
              best =
                  _FastTargetCandidate(
                    value:
                    target,
                    distance:
                    distance,
                  );
            }
          }
        }
      }

      if (best != null) {
        return best.value;
      }

      /*
       * نجرب occurrence أقدم فقط
       * لو آخر واحد مالوش Feedback قريب.
       */
      if (reelIndex == 0) {
        break;
      }

      reelIndex =
          window.lastIndexOf(
            reelId,
            reelIndex - 1,
          );

      checked++;
    }

    return null;
  }

  // =========================================================
  // VIDEO FAST TARGET
  //
  // هنا المصدر الأقوى:
  //
  // associated_video
  //
  // وبنجيب الـ feedback ID اللي قبله مباشرة.
  // =========================================================

  String? _extractVideoTargetFast(
      String window, {
        String? contentId,
      }) {
    if (window.isEmpty) {
      return null;
    }

    const marker =
        'associated_video';

    int markerIndex =
    window.lastIndexOf(
      marker,
    );

    int checked =
    0;

    while (markerIndex != -1 &&
        checked < 6) {
      /*
       * نشوف associated_video ده
       * خاص بنفس الفيديو ولا لأ.
       */
      final afterEnd =
      markerIndex + 1500 <
          window.length
          ? markerIndex +
          1500
          : window.length;

      final after =
      window.substring(
        markerIndex,
        afterEnd,
      );

      bool correctVideo =
      true;

      if (contentId != null) {
        correctVideo =
            after.contains(
              contentId,
            );
      }

      if (correctVideo) {
        final feedbackIndex =
        window.lastIndexOf(
          _feedbackPrefix,
          markerIndex,
        );

        if (feedbackIndex !=
            -1) {
          final distance =
              markerIndex -
                  feedbackIndex;

          /*
           * القديم كان بيدور 128KB للخلف.
           */
          if (distance <=
              128 * 1024) {
            final target =
            _decodeFeedbackAt(
              window,
              feedbackIndex,
            );

            if (target !=
                null &&
                target !=
                    contentId) {
              return target;
            }
          }
        }
      }

      if (markerIndex ==
          0) {
        break;
      }

      markerIndex =
          window.lastIndexOf(
            marker,
            markerIndex - 1,
          );

      checked++;
    }

    return null;
  }

  // =========================================================
  // DECODE FEEDBACK DIRECTLY AT PREFIX INDEX
  //
  // بدل RegExp على كل الـ HTML.
  // =========================================================

  String? _decodeFeedbackAt(
      String text,
      int start,
      ) {
    if (start < 0 ||
        start >=
            text.length) {
      return null;
    }

    if (!text.startsWith(
      _feedbackPrefix,
      start,
    )) {
      return null;
    }

    int end =
        start;

    /*
     * نمشي فقط لحد نهاية Base64 token.
     */
    while (end <
        text.length) {
      final code =
      text.codeUnitAt(
        end,
      );

      if (!_isBase64CodeUnit(
        code,
      )) {
        break;
      }

      end++;
    }

    if (end <=
        start) {
      return null;
    }

    /*
     * Feedback Base64 صغير.
     *
     * Safety limit يمنع إننا نلقط
     * string ضخمة بالغلط.
     */
    if (end -
        start >
        300) {
      end =
          start + 300;
    }

    final encoded =
    text.substring(
      start,
      end,
    );

    return _decodeFeedbackTarget(
      encoded,
    );
  }

  // =========================================================
  // BASE64 CHARACTER
  // =========================================================

  bool _isBase64CodeUnit(
      int c,
      ) {
    // A-Z
    if (c >= 65 &&
        c <= 90) {
      return true;
    }

    // a-z
    if (c >= 97 &&
        c <= 122) {
      return true;
    }

    // 0-9
    if (c >= 48 &&
        c <= 57) {
      return true;
    }

    // +
    if (c == 43) {
      return true;
    }

    // /
    if (c == 47) {
      return true;
    }

    // =
    if (c == 61) {
      return true;
    }

    // -
    if (c == 45) {
      return true;
    }

    // _
    if (c == 95) {
      return true;
    }

    return false;
  }

  // =========================================================
  // DECODE FACEBOOK FEEDBACK TARGET
  // =========================================================

  String? _decodeFeedbackTarget(
      String encoded,
      ) {
    try {
      String value =
      encoded
          .trim()
          .replaceAll(
        '-',
        '+',
      )
          .replaceAll(
        '_',
        '/',
      );

      while (value.length %
          4 !=
          0) {
        value += '=';
      }

      final decoded =
      utf8.decode(
        base64.decode(
          value,
        ),
        allowMalformed: true,
      );

      const prefix =
          'feedback:';

      if (!decoded.startsWith(
        prefix,
      )) {
        return null;
      }

      final target =
      decoded
          .substring(
        prefix.length,
      )
          .trim();

      /*
       * Numeric:
       *
       * 1465054465635144
       *
       * أو composite:
       *
       * 1000_1234
       */
      if (!RegExp(
        r'^\d{6,}(?:_\d{6,})*$',
      ).hasMatch(
        target,
      )) {
        return null;
      }

      return target;
    } catch (_) {
      return null;
    }
  }

  // =========================================================
  // APPEND SMALL ROLLING WINDOW
  // =========================================================

  String _appendRolling(
      String current,
      String chunk,
      int limit,
      ) {
    if (current.isEmpty) {
      if (chunk.length <=
          limit) {
        return chunk;
      }

      return chunk.substring(
        chunk.length -
            limit,
      );
    }

    final combined =
        current +
            chunk;

    if (combined.length <=
        limit) {
      return combined;
    }

    return combined.substring(
      combined.length -
          limit,
    );
  }

  // =========================================================
  // DID MARKER APPEAR IN NEW DATA?
  //
  // بدل window.contains(marker)
  // مع كل chunk.
  //
  // بندور في chunk الجديد +
  // tail صغير جدًا من القديم
  // علشان marker لو اتقسم بين chunks.
  // =========================================================

  bool _newMarkerAppeared(
      String previous,
      String chunk,
      String marker,
      ) {
    if (marker.isEmpty) {
      return false;
    }

    /*
     * لو marker كامل في chunk الجديد.
     */
    if (chunk.contains(
      marker,
    )) {
      return true;
    }

    /*
     * marker ممكن يكون متقسم:
     *
     * chunk1: ZmVlZGJ
     * chunk2: hY2s6...
     */
    final overlapLength =
        marker.length -
            1;

    String tail =
        previous;

    if (tail.length >
        overlapLength) {
      tail =
          tail.substring(
            tail.length -
                overlapLength,
          );
    }

    return (tail + chunk)
        .contains(
      marker,
    );
  }

  // =========================================================
  // REEL URL
  // =========================================================

  bool _isReelUrl(
      Uri uri,
      ) {
    for (final segment
    in uri.pathSegments) {
      if (segment.toLowerCase() ==
          'reel') {
        return true;
      }
    }

    return false;
  }

  // =========================================================
  // VIDEO URL
  // =========================================================

  bool _isVideoUrl(
      Uri uri,
      ) {
    if (_isReelUrl(
      uri,
    )) {
      return false;
    }

    final path =
    uri.path.toLowerCase();

    if (path.startsWith(
      '/watch',
    )) {
      return true;
    }

    if (path.contains(
      '/videos/',
    )) {
      return true;
    }

    if (path.startsWith(
      '/video.php',
    )) {
      return true;
    }

    if (uri.queryParameters
        .containsKey(
      'v',
    )) {
      return true;
    }

    return false;
  }

  // =========================================================
  // CONTENT ID HINT
  // =========================================================

  String? _extractContentIdHintFromUri(
      Uri uri,
      ) {
    const queryKeys =
    <String>[
      'v',
      'video_id',
      'videoid',
      'fbid',
    ];

    for (final key
    in queryKeys) {
      final value =
      uri.queryParameters[
      key
      ];

      if (_isNumericFacebookId(
        value,
      )) {
        return value;
      }
    }

    /*
     * /reel/2026690491566753/
     *
     * /owner/videos/title/1050363290822749/
     */
    for (
    int i =
        uri.pathSegments.length -
            1;
    i >= 0;
    i--
    ) {
      final value =
      uri.pathSegments[i];

      if (_isNumericFacebookId(
        value,
      )) {
        return value;
      }
    }

    return null;
  }

  bool _isNumericFacebookId(
      String? value,
      ) {
    if (value == null ||
        value.isEmpty) {
      return false;
    }

    return RegExp(
      r'^\d{6,}$',
    ).hasMatch(
      value,
    );
  }

  // =========================================================
  // HEADERS
  // =========================================================

  void _applyHeaders(
      HttpClientRequest request,
      String cookies,
      ) {
    request.headers.set(
      HttpHeaders.acceptHeader,
      'text/html,application/xhtml+xml,'
          'application/xml;q=0.9,*/*;q=0.8',
    );

    request.headers.set(
      HttpHeaders.acceptEncodingHeader,
      'gzip, deflate',
    );

    request.headers.set(
      HttpHeaders.acceptLanguageHeader,
      'en-US,en;q=0.9',
    );

    request.headers.set(
      'upgrade-insecure-requests',
      '1',
    );

    request.headers.set(
      HttpHeaders.userAgentHeader,
      'Mozilla/5.0 '
          '(Windows NT 10.0; Win64; x64)',
    );

    if (cookies.trim().isNotEmpty) {
      request.headers.set(
        HttpHeaders.cookieHeader,
        cookies.trim(),
      );
    }
  }

  // =========================================================
  // FAST POST
  // =========================================================

  String? _extractStrongPostId(
      String text,
      ) {
    final match =
    RegExp(
      r'''top_level_post_id[^0-9]{0,40}(\d{6,})''',
      caseSensitive: false,
      dotAll: true,
    ).firstMatch(
      text,
    );

    if (match != null) {
      return match.group(
        1,
      );
    }

    final permalinkMatch =
    RegExp(
      r'''/permalink/(\d{6,})/?''',
      caseSensitive: false,
    ).firstMatch(
      text,
    );

    return permalinkMatch
        ?.group(
      1,
    );
  }

  // =========================================================
  // FAST OWNER
  // =========================================================

  String? _extractStrongOwnerId(
      String text,
      ) {
    final match =
    RegExp(
      r'''content_owner_id_new[^0-9]{0,40}(\d{6,})''',
      caseSensitive: false,
      dotAll: true,
    ).firstMatch(
      text,
    );

    return match?.group(
      1,
    );
  }

  // =========================================================
  // NORMAL FULL RESOLVER
  //
  // للـ Post / Photo / Story فقط.
  // =========================================================

  FacebookTargetResult? _resolveNormalFromFullHtml(
      String html,
      ) {
    if (html.trim().isEmpty) {
      return null;
    }

    final postId =
    extractPostId(
      html,
    );

    final ownerId =
    extractActorOrPageId(
      html,
    );

    final profileId =
    extractProfileId(
      html,
    );

    final commentId =
    extractFocusCommentId(
      html,
    );

    String? composite;

    FacebookTargetType type =
        FacebookTargetType.unknown;

    // =====================================================
    // POST
    // =====================================================

    if (postId != null &&
        ownerId != null) {
      type =
          FacebookTargetType.post;

      if (commentId != null) {
        composite =
        '${ownerId}_${postId}_$commentId';
      } else {
        composite =
        '${ownerId}_$postId';
      }
    }

    // =====================================================
    // PROFILE
    // =====================================================

    else if (profileId !=
        null) {
      type =
          FacebookTargetType.profile;

      composite =
          profileId;
    }

    // =====================================================
    // PAGE
    // =====================================================

    else if (ownerId !=
        null) {
      type =
          FacebookTargetType.profile;

      composite =
          ownerId;
    }

    print(
      '================ FACEBOOK HTTP TARGET ================',
    );

    print(
      '🎯 postId    = '
          '${postId ?? "not found"}',
    );

    print(
      '👤 ownerId   = '
          '${ownerId ?? "not found"}',
    );

    print(
      '👤 profileId = '
          '${profileId ?? "not found"}',
    );

    print(
      '💬 commentId = '
          '${commentId ?? "not found"}',
    );

    print(
      '🆔 id        = '
          '${composite ?? "not found"}',
    );

    print(
      '======================================================',
    );

    if (composite == null) {
      return null;
    }

    return FacebookTargetResult(
      id:
      composite,
      ownerId:
      ownerId,
      profileId:
      profileId,
      postId:
      postId,
      commentId:
      commentId,
      type:
      type,
    );
  }

  // =========================================================
  // LIGHT UNESCAPE
  // =========================================================

  String _unescapeLight(
      String value,
      ) {
    return value
        .replaceAll(
      r'\/',
      '/',
    )
        .replaceAll(
      r'\"',
      '"',
    )
        .replaceAll(
      r'\\',
      '\\',
    );
  }

  // =========================================================
  // POST ID
  // =========================================================

  String? extractPostId(
      String text,
      ) {
    if (text.isEmpty) {
      return null;
    }

    final views =
    <String>[
      text,

      _unescapeLight(
        text,
      ),
    ];

    for (final view
    in views) {
      final postId =
      _extractPostIdFromView(
        view,
      );

      if (postId != null) {
        return postId;
      }
    }

    return null;
  }

  // =========================================================
  // POST ID FROM VIEW
  // =========================================================

  String? _extractPostIdFromView(
      String text,
      ) {
    final topMatch =
    RegExp(
      r'''top_level_post_id[^0-9]{0,40}(\d{6,})''',
      caseSensitive: false,
      dotAll: true,
    ).firstMatch(
      text,
    );

    if (topMatch != null) {
      final value =
      topMatch.group(
        1,
      );

      print(
        '✅ postId from top_level_post_id: '
            '$value',
      );

      return value;
    }

    final permalinkMatch =
    RegExp(
      r'''/permalink/(\d{6,})/?''',
      caseSensitive: false,
    ).firstMatch(
      text,
    );

    if (permalinkMatch !=
        null) {
      final value =
      permalinkMatch.group(
        1,
      );

      print(
        '✅ postId from permalink: '
            '$value',
      );

      return value;
    }

    final matches =
    _findPostIdMatches(
      text,
    );

    if (matches.isNotEmpty) {
      final counts =
      <String, int>{};

      for (final item
      in matches) {
        counts[item.value] =
            (counts[item.value] ??
                0) +
                1;
      }

      final sorted =
      counts.entries
          .toList()
        ..sort(
              (
              a,
              b,
              ) =>
              b.value.compareTo(
                a.value,
              ),
        );

      if (sorted.length > 1 &&
          sorted[0].value ==
              sorted[1].value) {
        return matches.first.value;
      }

      return sorted.first.key;
    }

    return _postIdAfterMarkers(
      text,
    );
  }

  // =========================================================
  // FIND POST MATCHES
  // =========================================================

  List<_PostIdMatch> _findPostIdMatches(
      String text,
      ) {
    final result =
    <_PostIdMatch>[];

    final pattern =
    RegExp(
      r'''post_id[^0-9]{0,40}(\d{6,})''',
      caseSensitive: false,
      dotAll: true,
    );

    for (final match
    in pattern.allMatches(
      text,
    )) {
      final start =
          match.start;

      const prefix =
          'top_level_';

      bool isTopLevel =
      false;

      if (start >=
          prefix.length) {
        final previous =
        text.substring(
          start -
              prefix.length,
          start,
        );

        if (previous
            .toLowerCase() ==
            prefix) {
          isTopLevel =
          true;
        }
      }

      if (isTopLevel) {
        continue;
      }

      final value =
      match.group(
        1,
      );

      if (value == null ||
          value.isEmpty) {
        continue;
      }

      result.add(
        _PostIdMatch(
          value:
          value,
          index:
          match.start,
        ),
      );
    }

    return result;
  }

  // =========================================================
  // POST ID AFTER MARKERS
  // =========================================================

  String? _postIdAfterMarkers(
      String text,
      ) {
    const markers =
    <String>[
      'CommentComposerGroupMentionsPlugin',
      'shareable_from_perspective_of_feed_ufi',
      'tracking',
    ];

    final lower =
    text.toLowerCase();

    for (final marker
    in markers) {
      final index =
      lower.indexOf(
        marker.toLowerCase(),
      );

      if (index == -1) {
        continue;
      }

      final section =
      text.substring(
        index,
      );

      final topMatch =
      RegExp(
        r'''top_level_post_id[^0-9]{0,40}(\d{6,})''',
        caseSensitive: false,
        dotAll: true,
      ).firstMatch(
        section,
      );

      if (topMatch != null) {
        return topMatch.group(
          1,
        );
      }

      final postMatches =
      _findPostIdMatches(
        section,
      );

      if (postMatches
          .isNotEmpty) {
        return postMatches.first.value;
      }
    }

    return null;
  }

  // =========================================================
  // OWNER / PAGE
  // =========================================================

  String? extractActorOrPageId(
      String text,
      ) {
    if (text.isEmpty) {
      return null;
    }

    final patterns =
    <RegExp>[
      RegExp(
        r'''["']page_id["']\s*:\s*["']?(\d+)["']?''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']pageID["']\s*:\s*["']?(\d+)["']?''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''content_owner_id_new[^0-9]{0,40}(\d{6,})''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']owner_id["']\s*:\s*["']?(\d+)["']?''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']timelineID["']\s*:\s*["']?(\d+)["']?''',
        caseSensitive: false,
        dotAll: true,
      ),
    ];

    final views =
    <String>[
      text,

      _unescapeLight(
        text,
      ),
    ];

    for (final view
    in views) {
      for (final pattern
      in patterns) {
        final match =
        pattern.firstMatch(
          view,
        );

        final value =
        match?.group(
          1,
        );

        if (value != null &&
            value.isNotEmpty) {
          return value;
        }
      }
    }

    return null;
  }

  // =========================================================
  // PROFILE
  // =========================================================

  String? extractProfileId(
      String text,
      ) {
    if (text.isEmpty) {
      return null;
    }

    final patterns =
    <RegExp>[
      RegExp(
        r'''["']userID["']\s*:\s*["'](\d{6,})["']''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']selectedID["']\s*:\s*["'](\d{6,})["']''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']actorID["']\s*:\s*["']?(\d{6,})["']?''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']actor_id["']\s*:\s*["']?(\d{6,})["']?''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']profile_id["']\s*:\s*["']?(\d{6,})["']?''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']actorId["']\s*:\s*["'](\d{6,})["']''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''["']userId["']\s*:\s*(\d{6,})''',
        caseSensitive: false,
        dotAll: true,
      ),

      RegExp(
        r'''profile\.php\?id=(\d{6,})''',
        caseSensitive: false,
      ),

      RegExp(
        r'''["']entity_id["']\s*:\s*["']?(\d{6,})["']?''',
        caseSensitive: false,
        dotAll: true,
      ),
    ];

    final views =
    <String>[
      text,

      _unescapeLight(
        text,
      ),
    ];

    for (final view
    in views) {
      for (final pattern
      in patterns) {
        final match =
        pattern.firstMatch(
          view,
        );

        final value =
        match?.group(
          1,
        );

        if (value != null &&
            value.isNotEmpty) {
          return value;
        }
      }
    }

    return null;
  }

  // =========================================================
  // COMMENT
  // =========================================================

  String? extractFocusCommentId(
      String text,
      ) {
    final match =
    RegExp(
      r'''["']focusCommentID["']\s*:\s*["']?(\d+)["']?''',
      caseSensitive: false,
    ).firstMatch(
      text,
    );

    return match?.group(
      1,
    );
  }

  // =========================================================
  // REDIRECT
  // =========================================================

  bool _isRedirectStatus(
      int statusCode,
      ) {
    return statusCode ==
        301 ||
        statusCode ==
            302 ||
        statusCode ==
            303 ||
        statusCode ==
            307 ||
        statusCode ==
            308;
  }

  // =========================================================
  // FACEBOOK HOST
  // =========================================================

  bool _isFacebookHost(
      String host,
      ) {
    final value =
    host.toLowerCase();

    return value ==
        'facebook.com' ||
        value.endsWith(
          '.facebook.com',
        );
  }

  // =========================================================
  // LOGIN
  // =========================================================

  bool _isFacebookLoginUrl(
      Uri uri,
      ) {
    final path =
    uri.path.toLowerCase();

    return path.startsWith(
      '/login',
    ) ||
        path.startsWith(
          '/checkpoint',
        );
  }
}

// =========================================================
// FAST TARGET CANDIDATE
// =========================================================

class _FastTargetCandidate {
  final String value;

  final int distance;

  const _FastTargetCandidate({
    required this.value,
    required this.distance,
  });
}

// =========================================================
// POST MATCH
// =========================================================

class _PostIdMatch {
  final String value;

  final int index;

  const _PostIdMatch({
    required this.value,
    required this.index,
  });
}

// =========================================================
// RESULT
// =========================================================

class FacebookTargetResult {
  final String? id;

  final String? ownerId;

  final String? profileId;

  final String? postId;

  final String? commentId;

  final FacebookTargetType type;

  const FacebookTargetResult({
    required this.id,
    required this.ownerId,
    required this.profileId,
    required this.postId,
    required this.commentId,
    required this.type,
  });

  /*
   * id = Target ID النهائي.
   *
   * Post:
   * owner_post
   *
   * Reel:
   * real feedback ID
   *
   * Video:
   * real feedback ID
   */
  String? get reactionTarget {
    if (type !=
        FacebookTargetType.post) {
      return null;
    }

    if (id == null ||
        id!.trim().isEmpty) {
      return null;
    }

    return id;
  }

  bool get hasReactionTarget =>
      reactionTarget !=
          null;

  @override
  String toString() {
    return 'FacebookTargetResult('
        'id=$id, '
        'ownerId=$ownerId, '
        'profileId=$profileId, '
        'postId=$postId, '
        'commentId=$commentId, '
        'type=$type'
        ')';
  }
}

// =========================================================
// TYPE
// =========================================================

enum FacebookTargetType {
  post,
  profile,
  unknown,
}