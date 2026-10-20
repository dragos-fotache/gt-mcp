package com.dragosfotache.gymtracka.data.sync.roombackend

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.dragosfotache.gymtracka.data.sync.store.ProjectionPublicationStatus
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import org.junit.Test
import org.junit.runner.RunWith

/** Actual MCP/backend -> ordinary Android pull -> Room/repository observation.
 * Public contract oracle: exact submitted IDs/graph independently checked by the
 * host against PostgreSQL, plus literal default/null/zero/order requirements.
 * Credentials remain in target-private files and never enter assertion output.
 */
@RunWith(AndroidJUnit4::class)
class T16McpSyncTest {
    @Test
    fun savedMcpRoutineArrivesThroughOrdinarySync() = runBlocking(Dispatchers.IO) {
        withTimeout(120_000) {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val setupFile = File(context.filesDir, "t16-setup.json")
            val expectedFile = File(context.filesDir, "t16-expected.json")
            val readyFile = File(context.filesDir, "t16-ready")
            val startedFile = File(context.filesDir, "t16-started")
            // Connected Gradle may reinstall/clear target data. Admit the private
            // input handoff only after this actual native invocation has started.
            startedFile.writeText("started")
            while (!setupFile.exists()) delay(100)
            val setup = JSONObject(setupFile.readText())
            val transport = r10aNewTransport(
                R10aInputs(setup.getInt("port"), setup.getString("certificate")),
            )
            val account = R10aAccount(setup.getString("accountId"), setup.getString("accessToken"))
            val store = r10aOpenStore(context, "t16-s7", account.accountId)
            try {
                val api = r10aNewApi(transport, account)
                val baseline = r10aSnapshotConverge(store, account.accountId, api, R10aTestLease())
                check(baseline.status == ProjectionPublicationStatus.PUBLISHED) { "Baseline publication failed" }
                store.database.openHelper.readableDatabase.query("SELECT COUNT(*) FROM routines").use {
                    check(it.moveToFirst() && it.getInt(0) == 0) { "Android baseline is not empty" }
                }
                readyFile.writeText("ready")
                // External host is creating via MCP; bounded polling is a handoff,
                // not a timer used to infer completion of asynchronous storage.
                while (!expectedFile.exists()) delay(100)
                val expected = JSONObject(expectedFile.readText())
                val (delivery, publication) = r10aDeliverAndPublish(
                    store, account.accountId, api, R10aTestLease(),
                )
                check(delivery.committedBatches == 3) { "Ordinary pull did not receive all three creation batches" }
                check(publication?.status == ProjectionPublicationStatus.PUBLISHED) { "Saved graph publication failed" }
                check(publication.cacheEpoch == publication.materializedEpoch) { "Projection epochs differ" }
                suspend fun verifyGraph() {
                    val details = checkNotNull(store.repository().routineDetails(expected.getString("id"))) {
                        "Saved routine absent from Android repository"
                    }
                    check(details.routine.name == " T16 Android ordinary sync ") { "Routine name changed" }
                    check(!details.routine.isDraft && details.routine.serverRevision == 3L) { "Saved state/revision changed" }
                    check(details.routine.accountId == account.accountId) { "Routine account changed" }
                    val entries = expected.getJSONArray("exercises")
                    check(details.exercises.size == 3 && entries.length() == 3) { "Entry count changed" }
                    details.exercises.forEachIndexed { index, item ->
                        val wanted = entries.getJSONObject(index)
                        val entry = item.routineExercise
                        check(entry.id == wanted.getString("id") && entry.routineId == expected.getString("id")) {
                            "Entry identity/parent changed"
                        }
                        check(entry.exerciseId == wanted.getString("exerciseId") && entry.position == index) {
                            "Entry reference/order changed"
                        }
                        check(entry.restDurationSeconds == if (index == 1) 0 else 30) { "Default/zero rest changed" }
                        val sets = wanted.getJSONArray("sets")
                        check(item.sets.size == sets.length()) { "Set count changed" }
                        item.sets.forEachIndexed { setIndex, set ->
                            val wantedSet = sets.getJSONObject(setIndex)
                            check(set.id == wantedSet.getString("id") && set.routineExerciseId == entry.id) {
                                "Set identity/parent changed"
                            }
                            check(set.position == setIndex) { "Set order changed" }
                            val reps = if (wantedSet.isNull("repetitions")) null else wantedSet.getInt("repetitions")
                            val weight = if (wantedSet.isNull("weightKg")) null else wantedSet.getDouble("weightKg")
                            check(set.repetitions == reps && set.weightKg == weight) { "Null/zero/numeric targets changed" }
                        }
                    }
                    store.database.openHelper.readableDatabase.query("SELECT COUNT(*) FROM routines").use {
                        check(it.moveToFirst() && it.getInt(0) == 1) { "Android has duplicate/unrelated routines" }
                    }
                }
                verifyGraph()
                val (again, second) = r10aDeliverAndPublish(store, account.accountId, api, R10aTestLease())
                check(again.committedBatches == 0 && second != null) { "Repeated sync duplicated creation" }
                r10aAssertQuiescentTail(store, account.accountId, api, "T16 Android")
                verifyGraph()
            } finally {
                setupFile.delete()
                expectedFile.delete()
                readyFile.delete()
                startedFile.delete()
                r10aCloseAndDelete(context, store)
                transport.client.connectionPool.evictAll()
                transport.client.dispatcher.executorService.shutdown()
            }
        }
    }
}
