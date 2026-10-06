export function WhatYourPhotosRevealAboutYouArticle() {
  return (
    <>
      <p>
        A photograph is not only the picture. Cameras and phones write a block of structured data
        alongside the image at the moment of capture, and that block travels with the file. It can
        contain the exact latitude and longitude where you were standing, the time to the second,
        the make and model of the device, and in some cases the camera's serial number or the name
        of the person it is registered to.
      </p>
      <p>
        Metadata is not sinister in itself. The problem is that almost nobody looks at it, and the
        places people share photos differ enormously in whether they remove it. The same photo can be
        safe on one platform and reveal your home address when sent by email.
      </p>

      <h2>What is actually stored</h2>
      <p>
        The container is called EXIF, short for Exchangeable Image File Format. The fields that
        matter most, and what each one gives away:
      </p>
      <ul>
        <li>
          <strong>GPS latitude, longitude and altitude:</strong> if location tagging was enabled this
          is usually accurate to a few metres. A photo of an item you are selling, taken in your
          living room, carries the coordinates of your living room.
        </li>
        <li>
          <strong>DateTimeOriginal:</strong> the capture time to the second, sometimes with the time
          zone offset. This is what makes a photo useful as evidence, and also what makes it useful
          for correlating your movements.
        </li>
        <li>
          <strong>Make and Model:</strong> the manufacturer and specific device model, which
          identifies roughly when the hardware was current and which lens took the shot.
        </li>
        <li>
          <strong>Serial numbers and owner fields:</strong> some cameras write a body serial number,
          and some let you set an artist or copyright field. Photographers who fill these in once and
          forget publish their name and equipment identity with every image.
        </li>
        <li>
          <strong>Software and orientation:</strong> the application that last wrote the file, and the
          rotation flag that explains why a photo can appear sideways once the tag is stripped without
          the pixels being rotated.
        </li>
      </ul>
      <p>
        JPEG and TIFF files carry EXIF. PNG and WebP generally do not, although PNG has its own text
        chunks and WebP can hold an EXIF block, so "no EXIF" is a tendency rather than a rule.
        Screenshots usually carry nothing useful, which is one reason they are a popular way to share
        something sensitive, though it is easy to screenshot more of the screen than you meant to.
      </p>

      <h2>Who can read it, and when</h2>
      <p>
        Anyone who receives the original file can read everything in it, using free tools. What
        varies is which sharing routes strip it:
      </p>
      <ul>
        <li>
          <strong>Social platforms:</strong> the large ones generally remove EXIF during upload,
          because they re-encode the image to serve several sizes. The original is replaced by their
          processed copy, which is why uploading to a social network is often the safest way to
          publish a photo.
        </li>
        <li>
          <strong>Email:</strong> attachments are sent as-is. Nothing in the mail system edits your
          JPEG, so it arrives with the GPS coordinates intact. This is the biggest gap between what
          people assume and what happens.
        </li>
        <li>
          <strong>Messaging apps:</strong> many re-compress photos and strip metadata, but not all,
          and behaviour differs between "send as photo" and "send as file". Sending as a file usually
          means sending the original.
        </li>
        <li>
          <strong>Cloud storage links:</strong> the file is untouched, so the metadata is present for
          anyone the link reaches.
        </li>
        <li>
          <strong>Direct file transfer:</strong> a copy is a copy. Whatever is in the file arrives
          with it.
        </li>
      </ul>

      <h2>How to check a photo before you send it</h2>
      <ol>
        <li>
          <strong>Windows:</strong> right-click the file, choose <strong>Properties</strong>, then
          the <strong>Details</strong> tab, and scroll to the Camera and GPS sections. Latitude and
          longitude appear as decimal values. If those sections are missing, there is no GPS data.
        </li>
        <li>
          <strong>macOS:</strong> open the image in Preview and press <code>Command-I</code> to
          toggle the inspector. The EXIF and GPS tabs show the full block, including altitude and
          capture time.
        </li>
        <li>
          <strong>Any platform:</strong> a metadata viewer reads the same fields, and some plot the
          coordinates on a map, which shows the problem far more clearly than two decimal numbers.
        </li>
      </ol>
      <p>
        Check a photo taken at home before you list something for sale, and check a photo of your
        children before you send it to anyone you met online.
      </p>

      <h2>How to remove it</h2>
      <h3>Re-encode the image</h3>
      <p>
        Opening an image in an editor and exporting a new copy usually writes a clean file, because
        the editor rebuilds the image and records only the metadata it knows about. This also lets you
        resize and compress in the same pass, and apply any orientation rotation to the pixels before
        the tag disappears. The risk is that a re-encode applies lossy compression again, so do it
        once, at the quality you intend to publish.
      </p>
      <h3>Use a metadata editor</h3>
      <p>
        Tools that edit EXIF can remove selected tags and nothing else. This is the right choice when
        you want to keep the capture date and copyright line but drop the GPS block, and it is the
        approach that leaves the underlying compressed image stream completely untouched without recompression.
      </p>
      <blockquote>
        A useful habit: any image you are about to publish should pass through a step that rewrites
        it, so the output is built fresh rather than copied.
      </blockquote>

      <h2>What to keep, and what to drop</h2>
      <p>
        Metadata is not the enemy. The capture date is worth keeping for your own archive, and
        copyright or credit fields are worth keeping on published work. The fields to drop before
        anything leaves your device are the ones that identify a place or a specific physical object:
        GPS coordinates, GPS altitude, the camera serial number and any owner or artist field
        containing your full name. Location tagging on the camera itself is worth turning off by
        default, because it is useful for a few photos and easy to forget which ones those were.
      </p>
      <p>
        A browser-based image tool that never uploads your file is a convenient place to do this. The
        compressed or resized copy that comes out is a new file, and the location data in the original
        does not come with it.
      </p>
    </>
  );
}
