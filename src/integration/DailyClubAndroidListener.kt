package com.example.dailyclub

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.database.*

class NotificationListener(private val context: Context) {

    private val database: FirebaseDatabase = FirebaseDatabase.getInstance()
    private val notificationsRef: DatabaseReference = database.getReference("root/notifications")
    private var isInitialized = false

    // Initialize notification channel for Android O and above
    init {
        createNotificationChannel()
    }

    fun startListening() {
        // Query to listen for new notifications added after app start
        // Using server timestamp would be ideal, but limitToLast(1) with client-side filter is robust
        val query = notificationsRef.limitToLast(2)
        
        val startTime = System.currentTimeMillis()

        query.addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                try {
                    val title = snapshot.child("title").getValue(String::class.java)
                    val message = snapshot.child("message").getValue(String::class.java)
                    val timestamp = snapshot.child("timestamp").getValue(Long::class.java) ?: 0L

                    // Filter: Only show notifications created AFTER the listener started
                    // (Allowing a 2-second buffer for clock skew)
                    if (timestamp > (startTime - 2000)) {
                        if (title != null && message != null) {
                            showNotification(title, message)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("NotificationListener", "Error parsing notification", e)
                }
            }

            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {
                Log.e("NotificationListener", "Database error: ${error.message}")
            }
        })
    }

    private fun showNotification(title: String, message: String) {
        val intent = Intent(context, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        
        val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Replace with your app icon 'R.drawable.ic_notification'
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "DailyClub Broadcasts"
            val descriptionText = "Notifications from Admin"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    companion object {
        private const val CHANNEL_ID = "dailyclub_broadcasts"
    }
}

// Usage in MainActivity.kt:
// override fun onCreate(savedInstanceState: Bundle?) {
//     super.onCreate(savedInstanceState)
//     setContentView(R.layout.activity_main)
//
//     // Start listening
//     val listener = NotificationListener(this)
//     listener.startListening()
// }
